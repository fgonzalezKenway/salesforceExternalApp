const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');

loadLocalEnv();

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3001);
const API_VERSION = process.env.SF_API_VERSION || 'v62.0';
const LOGIN_URL = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';

const CONTACT_SELECT_FIELDS = [
    'Id',
    'Name',
    'Title',
    'MailingCity',
    'Active__c',
    'Challenger_Profile__c',
    'Networking_Owner__c',
    'Networking_Owner__r.Name',
    'Kenway_Status__c',
    'Last_Interaction_Date__c',
    'Next_Planned_Interaction__c',
    'Kenway_s_Priority__c',
    'Next_Steps__c',
    'Networking_Notes__c',
    'Networking_Plan_Association__c',
    'AccountId',
    'Account.Name',
    'Account.Kenway_Vertical__c'
];

const UPDATEABLE_FIELDS = new Set([
    'Title',
    'MailingCity',
    'Active__c',
    'Challenger_Profile__c',
    'Networking_Owner__c',
    'Kenway_Status__c',
    'Next_Planned_Interaction__c',
    'Kenway_s_Priority__c',
    'Next_Steps__c',
    'Networking_Notes__c',
    'Networking_Plan_Association__c'
]);

const PICKLIST_FIELD_NAMES = [
    'Networking_Plan_Association__c',
    'Challenger_Profile__c',
    'Kenway_Status__c',
    'Kenway_s_Priority__c'
];

const cache = {
    token: null,
    metadata: null,
    metadataFetchedAt: 0
};

function loadLocalEnv() {
    const envPath = path.join(__dirname, '.env');
    try {
        const contents = require('node:fs').readFileSync(envPath, 'utf8');
        contents.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
                return;
            }

            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex === -1) {
                return;
            }

            const key = trimmed.slice(0, separatorIndex).trim();
            const value = trimmed.slice(separatorIndex + 1).trim();
            if (key && !process.env[key]) {
                process.env[key] = value;
            }
        });
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}

function readEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload, contentType = 'text/plain; charset=utf-8') {
    res.writeHead(statusCode, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store'
    });
    res.end(payload);
}

async function readRequestBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }

    const body = Buffer.concat(chunks).toString('utf8');
    if (!body) {
        return {};
    }

    try {
        return JSON.parse(body);
    } catch (error) {
        const parseError = new Error('Request body must be valid JSON');
        parseError.statusCode = 400;
        throw parseError;
    }
}

async function getAccessToken(forceRefresh = false) {
    if (!forceRefresh && cache.token) {
        return cache.token;
    }

    const params = new URLSearchParams({
        grant_type: 'password',
        client_id: readEnv('SF_CLIENT_ID'),
        client_secret: readEnv('SF_CLIENT_SECRET'),
        username: readEnv('SF_USERNAME'),
        password: readEnv('SF_PASSWORD') + readEnv('SF_SECURITY_TOKEN')
    });

    const response = await fetch(`${LOGIN_URL}/services/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    const payload = await response.json();
    if (!response.ok) {
        const error = new Error(payload.error_description || 'Salesforce login failed');
        error.statusCode = 502;
        throw error;
    }

    cache.token = payload;
    return payload;
}

async function salesforceRequest(resourcePath, init = {}, attempt = 0) {
    const auth = await getAccessToken(attempt > 0);
    const response = await fetch(`${auth.instance_url}${resourcePath}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${auth.access_token}`,
            Accept: 'application/json',
            ...(init.headers || {})
        }
    });

    if (response.status === 401 && attempt === 0) {
        cache.token = null;
        return salesforceRequest(resourcePath, init, 1);
    }

    return response;
}

async function salesforceJson(resourcePath, init = {}, attempt = 0) {
    const response = await salesforceRequest(resourcePath, init, attempt);
    const text = await response.text();
    let payload = null;

    if (text) {
        try {
            payload = JSON.parse(text);
        } catch (error) {
            payload = text;
        }
    }

    if (!response.ok) {
        const apiMessage = Array.isArray(payload)
            ? payload.map((entry) => entry.message).filter(Boolean).join('; ')
            : payload?.[0]?.message || payload?.message || response.statusText;

        const error = new Error(apiMessage || 'Salesforce request failed');
        error.statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
        error.details = payload;
        throw error;
    }

    return payload;
}

function normalizeOption(entry) {
    return {
        label: entry.label,
        value: entry.value
    };
}

function getPicklistFieldMap(describe) {
    const fieldMap = new Map();
    for (const field of describe.fields || []) {
        fieldMap.set(field.name, field);
    }
    return fieldMap;
}

async function querySalesforce(soql) {
    const encoded = encodeURIComponent(soql);
    return salesforceJson(`/services/data/${API_VERSION}/query?q=${encoded}`);
}

async function getMetadata(forceRefresh = false) {
    const cacheAge = Date.now() - cache.metadataFetchedAt;
    if (!forceRefresh && cache.metadata && cacheAge < 5 * 60 * 1000) {
        return cache.metadata;
    }

    const describe = await salesforceJson(`/services/data/${API_VERSION}/sobjects/Contact/describe`);
    const fieldMap = getPicklistFieldMap(describe);

    const picklists = {};
    for (const fieldName of PICKLIST_FIELD_NAMES) {
        const field = fieldMap.get(fieldName);
        picklists[fieldName] = (field?.picklistValues || [])
            .filter((entry) => entry.active)
            .map(normalizeOption);
    }

    const employeeQuery = [
        'SELECT Id, Name',
        'FROM Employee__c',
        'WHERE Active_Employee__c = true',
        'ORDER BY Name ASC',
        'LIMIT 500'
    ].join(' ');

    const employeeResult = await querySalesforce(employeeQuery);
    const ownerOptions = employeeResult.records.map((record) => ({
        label: record.Name,
        value: record.Id
    }));

    cache.metadata = {
        picklists,
        ownerOptions
    };
    cache.metadataFetchedAt = Date.now();
    return cache.metadata;
}

function escapeSoql(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeLikeTerm(value) {
    return escapeSoql(value)
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
}

function formatContactRow(record) {
    return {
        id: record.Id,
        name: record.Name,
        title: record.Title || '',
        mailingCity: record.MailingCity || '',
        active: Boolean(record.Active__c),
        challengerProfile: record.Challenger_Profile__c || '',
        networkingOwnerId: record.Networking_Owner__c || '',
        networkingOwnerName: record.Networking_Owner__r?.Name || '',
        kenwayStatus: record.Kenway_Status__c || '',
        lastInteractionDate: record.Last_Interaction_Date__c || '',
        nextPlannedInteraction: record.Next_Planned_Interaction__c || '',
        networkingPriority: record.Kenway_s_Priority__c || '',
        nextSteps: record.Next_Steps__c || '',
        networkingNotes: record.Networking_Notes__c || '',
        networkingPlanAssociation: record.Networking_Plan_Association__c
            ? record.Networking_Plan_Association__c.split(';').filter(Boolean)
            : [],
        accountId: record.AccountId || '',
        accountName: record.Account?.Name || '',
        accountVertical: record.Account?.Kenway_Vertical__c || ''
    };
}

async function getContacts({ vertical, search, limit }) {
    const metadata = await getMetadata();
    const verticalValues = new Set(
        metadata.picklists.Networking_Plan_Association__c.map((option) => option.value)
    );

    const size = Math.min(Math.max(Number(limit) || 100, 1), 250);
    const whereClauses = ["Networking_Plan_Association__c != null"];

    if (vertical) {
        if (!verticalValues.has(vertical)) {
            const error = new Error('Invalid networking plan filter');
            error.statusCode = 400;
            throw error;
        }
        whereClauses.push(
            `Networking_Plan_Association__c INCLUDES ('${escapeSoql(vertical)}')`
        );
    }

    if (search) {
        const searchTerm = escapeLikeTerm(search.trim());
        if (searchTerm) {
            whereClauses.push(
                [
                    '(',
                    `Name LIKE '%${searchTerm}%'`,
                    `OR Title LIKE '%${searchTerm}%'`,
                    `OR MailingCity LIKE '%${searchTerm}%'`,
                    `OR Account.Name LIKE '%${searchTerm}%'`,
                    ')'
                ].join(' ')
            );
        }
    }

    const soql = [
        `SELECT ${CONTACT_SELECT_FIELDS.join(', ')}`,
        'FROM Contact',
        `WHERE ${whereClauses.join(' AND ')}`,
        'ORDER BY Account.Name ASC NULLS LAST, Name ASC',
        `LIMIT ${size}`
    ].join(' ');

    const result = await querySalesforce(soql);
    return result.records.map(formatContactRow);
}

async function getContactById(contactId) {
    const soql = [
        `SELECT ${CONTACT_SELECT_FIELDS.join(', ')}`,
        'FROM Contact',
        `WHERE Id = '${escapeSoql(contactId)}'`,
        'LIMIT 1'
    ].join(' ');

    const result = await querySalesforce(soql);
    if (!result.records.length) {
        const error = new Error('Contact not found');
        error.statusCode = 404;
        throw error;
    }
    return formatContactRow(result.records[0]);
}

function validateSingleValue(fieldName, value, allowedValues) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }
    if (!allowedValues.has(value)) {
        const error = new Error(`Invalid value for ${fieldName}`);
        error.statusCode = 400;
        throw error;
    }
    return value;
}

function validateMultiValue(fieldName, values, allowedValues) {
    if (!Array.isArray(values) || values.length === 0) {
        return null;
    }

    for (const value of values) {
        if (!allowedValues.has(value)) {
            const error = new Error(`Invalid value for ${fieldName}`);
            error.statusCode = 400;
            throw error;
        }
    }

    return values.join(';');
}

async function sanitizeContactUpdate(payload) {
    const metadata = await getMetadata();
    const picklistSets = {
        Networking_Plan_Association__c: new Set(
            metadata.picklists.Networking_Plan_Association__c.map((option) => option.value)
        ),
        Challenger_Profile__c: new Set(
            metadata.picklists.Challenger_Profile__c.map((option) => option.value)
        ),
        Kenway_Status__c: new Set(
            metadata.picklists.Kenway_Status__c.map((option) => option.value)
        ),
        Kenway_s_Priority__c: new Set(
            metadata.picklists.Kenway_s_Priority__c.map((option) => option.value)
        )
    };
    const ownerIds = new Set(metadata.ownerOptions.map((option) => option.value));
    const cleaned = {};

    for (const [fieldName, rawValue] of Object.entries(payload || {})) {
        if (!UPDATEABLE_FIELDS.has(fieldName)) {
            continue;
        }

        switch (fieldName) {
            case 'Title':
            case 'MailingCity':
            case 'Next_Steps__c':
            case 'Networking_Notes__c':
                cleaned[fieldName] = rawValue == null ? '' : String(rawValue);
                break;
            case 'Active__c':
                cleaned[fieldName] = Boolean(rawValue);
                break;
            case 'Next_Planned_Interaction__c':
                cleaned[fieldName] = rawValue ? String(rawValue) : null;
                break;
            case 'Networking_Owner__c':
                cleaned[fieldName] = validateSingleValue(fieldName, rawValue, ownerIds);
                break;
            case 'Challenger_Profile__c':
            case 'Kenway_Status__c':
            case 'Kenway_s_Priority__c':
                cleaned[fieldName] = validateSingleValue(fieldName, rawValue, picklistSets[fieldName]);
                break;
            case 'Networking_Plan_Association__c':
                cleaned[fieldName] = validateMultiValue(fieldName, rawValue, picklistSets[fieldName]);
                break;
            default:
                break;
        }
    }

    if (!Object.keys(cleaned).length) {
        const error = new Error('No editable fields were provided');
        error.statusCode = 400;
        throw error;
    }

    return cleaned;
}

async function updateContact(contactId, payload) {
    const fields = await sanitizeContactUpdate(payload);
    await salesforceJson(`/services/data/${API_VERSION}/sobjects/Contact/${contactId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
    });

    return getContactById(contactId);
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.html':
            return 'text/html; charset=utf-8';
        case '.css':
            return 'text/css; charset=utf-8';
        case '.js':
            return 'application/javascript; charset=utf-8';
        case '.json':
            return 'application/json; charset=utf-8';
        default:
            return 'application/octet-stream';
    }
}

async function serveStatic(req, res, pathname) {
    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

    if (!filePath.startsWith(PUBLIC_DIR)) {
        sendText(res, 403, 'Forbidden');
        return;
    }

    try {
        const contents = await fs.readFile(filePath);
        sendText(res, 200, contents, getContentType(filePath));
    } catch (error) {
        if (error.code === 'ENOENT') {
            sendText(res, 404, 'Not found');
            return;
        }
        throw error;
    }
}

function buildBootstrapPayload(metadata) {
    return {
        filters: {
            verticalOptions: metadata.picklists.Networking_Plan_Association__c
        },
        fields: {
            planAssociationOptions: metadata.picklists.Networking_Plan_Association__c,
            challengerProfileOptions: metadata.picklists.Challenger_Profile__c,
            kenwayStatusOptions: metadata.picklists.Kenway_Status__c,
            networkingPriorityOptions: metadata.picklists.Kenway_s_Priority__c,
            ownerOptions: metadata.ownerOptions
        }
    };
}

async function routeApi(req, res, pathname, searchParams) {
    if (req.method === 'GET' && pathname === '/api/health') {
        const requiredEnv = [
            'SF_CLIENT_ID',
            'SF_CLIENT_SECRET',
            'SF_USERNAME',
            'SF_PASSWORD',
            'SF_SECURITY_TOKEN'
        ];
        const missing = requiredEnv.filter((name) => !process.env[name]);
        sendJson(res, 200, {
            ok: true,
            configComplete: missing.length === 0,
            missing
        });
        return;
    }

    if (req.method === 'GET' && pathname === '/api/bootstrap') {
        const metadata = await getMetadata();
        sendJson(res, 200, buildBootstrapPayload(metadata));
        return;
    }

    if (req.method === 'GET' && pathname === '/api/contacts') {
        const contacts = await getContacts({
            vertical: searchParams.get('vertical') || '',
            search: searchParams.get('search') || '',
            limit: searchParams.get('limit') || 100
        });
        sendJson(res, 200, {
            records: contacts,
            count: contacts.length
        });
        return;
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/contacts/')) {
        const contactId = pathname.split('/').pop();
        if (!contactId) {
            sendJson(res, 400, { message: 'Missing contact id' });
            return;
        }

        const body = await readRequestBody(req);
        const record = await updateContact(contactId, body);
        sendJson(res, 200, { record });
        return;
    }

    sendJson(res, 404, { message: 'Endpoint not found' });
}

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);

        if (url.pathname.startsWith('/api/')) {
            await routeApi(req, res, url.pathname, url.searchParams);
            return;
        }

        await serveStatic(req, res, url.pathname);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        sendJson(res, statusCode, {
            message: error.message || 'Unexpected server error',
            details: error.details || null
        });
    }
});

server.listen(PORT, () => {
    console.log(`Standalone networking plan app running at http://localhost:${PORT}`);
});
