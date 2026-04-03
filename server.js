const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');

loadLocalEnv();

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3001);
const API_VERSION = process.env.SF_API_VERSION || 'v66.0';
const AUTH_FLOW = (process.env.SF_AUTH_FLOW || 'client_credentials').toLowerCase();
const LOGIN_URL = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';
const APP_SERVICE_AUTH_REQUIRED = parseBoolean(process.env.APP_SERVICE_AUTH_REQUIRED || 'false');
const APP_SERVICE_AUTH_ALLOWED_IDPS = new Set(
    (process.env.APP_SERVICE_AUTH_ALLOWED_IDPS || 'aad')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
);

const CONTACT_SELECT_FIELDS = [
    'Id',
    'Name',
    'Title',
    'Email',
    'MailingCity',
    'Active__c',
    'Challenger_Profile__c',
    'Networking_Owner__c',
    'Networking_Owner__r.Name',
    'Kenway_Status__c',
    'Last_Interaction_Date__c',
    'Last_Interaction_Organizer__c',
    'Last_Interaction_Organizer__r.Name',
    'Next_Planned_Interaction__c',
    'Kenway_s_Priority__c',
    'Next_Steps__c',
    'Networking_Notes__c',
    'Networking_Notes_Short__c',
    'Networking_Plan_Association__c',
    'AccountId',
    'Account.Name',
    'Account.Kenway_Vertical__c'
];

const ACCOUNT_SELECT_FIELDS = [
    'Id',
    'Name',
    'Industry',
    'Website',
    'BillingCity',
    'BillingState',
    'Description',
    'Annual_Revenue__c',
    'Target_Company__c',
    'Kenway_Vertical__c'
];

const UPDATEABLE_FIELDS = new Set([
    'Title',
    'Email',
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

const CREATEABLE_FIELDS = new Set([
    'FirstName',
    'LastName',
    'AccountId',
    'Title',
    'MailingCity',
    'Active__c',
    'Challenger_Profile__c',
    'Networking_Owner__c',
    'Kenway_Status__c',
    'Kenway_s_Priority__c',
    'Next_Steps__c',
    'Networking_Notes__c',
    'Networking_Plan_Association__c'
]);

const ACCOUNT_CREATEABLE_FIELDS = new Set([
    'Name',
    'Industry',
    'Website',
    'BillingCity',
    'BillingState',
    'Description',
    'Annual_Revenue__c',
    'Target_Company__c'
]);

const PICKLIST_FIELD_NAMES = [
    'Networking_Plan_Association__c',
    'Challenger_Profile__c',
    'Kenway_Status__c',
    'Kenway_s_Priority__c'
];

const ACCOUNT_PICKLIST_FIELD_NAMES = [
    'Industry',
    'Annual_Revenue__c',
    'Target_Company__c'
];

const LIST_COLUMN_CATALOG = {
    name: {
        key: 'name',
        label: 'Name',
        type: 'text',
        editable: false
    },
    accountName: {
        key: 'accountName',
        label: 'Company Name',
        type: 'text',
        editable: false
    },
    title: {
        key: 'title',
        label: 'Title',
        type: 'text',
        editable: true,
        updateField: 'Title'
    },
    networkingPlanAssociation: {
        key: 'networkingPlanAssociation',
        label: 'Networking Plan Association',
        type: 'multiselect',
        editable: true,
        updateField: 'Networking_Plan_Association__c',
        optionsSource: 'planAssociationOptions'
    },
    email: {
        key: 'email',
        label: 'Email',
        type: 'text',
        editable: true,
        updateField: 'Email'
    },
    mailingCity: {
        key: 'mailingCity',
        label: 'Mailing City',
        type: 'text',
        editable: true,
        updateField: 'MailingCity'
    },
    challengerProfile: {
        key: 'challengerProfile',
        label: 'Challenger Profile',
        type: 'select',
        editable: true,
        updateField: 'Challenger_Profile__c',
        optionsSource: 'challengerProfileOptions'
    },
    networkingOwner: {
        key: 'networkingOwnerId',
        displayKey: 'networkingOwnerName',
        label: 'Networking Owner',
        type: 'select',
        editable: true,
        updateField: 'Networking_Owner__c',
        optionsSource: 'ownerOptions'
    },
    kenwayStatus: {
        key: 'kenwayStatus',
        label: 'Relationship Status',
        type: 'select',
        editable: true,
        updateField: 'Kenway_Status__c',
        optionsSource: 'kenwayStatusOptions'
    },
    lastInteractionDate: {
        key: 'lastInteractionDate',
        label: 'Last Interaction Date',
        type: 'date',
        editable: false
    },
    lastInteractionOrganizer: {
        key: 'lastInteractionOrganizerName',
        label: 'Last Interaction Organizer',
        type: 'text',
        editable: false
    },
    nextPlannedInteraction: {
        key: 'nextPlannedInteraction',
        label: 'Next Planned Interaction',
        type: 'date',
        editable: false
    },
    networkingPriority: {
        key: 'networkingPriority',
        label: 'Networking Priority',
        type: 'select',
        editable: true,
        updateField: 'Kenway_s_Priority__c',
        optionsSource: 'networkingPriorityOptions'
    },
    nextSteps: {
        key: 'nextSteps',
        label: 'Next Steps',
        type: 'textarea',
        editable: true,
        updateField: 'Next_Steps__c'
    },
    networkingNotes: {
        key: 'networkingNotes',
        label: 'Networking Notes',
        type: 'textarea',
        editable: true,
        updateField: 'Networking_Notes__c'
    }
};

const STANDARD_LIST_COLUMN_KEYS = [
    'name',
    'accountName',
    'title',
    'networkingPlanAssociation',
    'email',
    'mailingCity',
    'challengerProfile',
    'networkingOwner',
    'kenwayStatus',
    'lastInteractionDate',
    'lastInteractionOrganizer',
    'nextPlannedInteraction',
    'networkingPriority',
    'nextSteps',
    'networkingNotes'
];

const CONTACT_CENTER_COLUMN_KEYS = [
    'name',
    'accountName',
    'title',
    'email',
    'mailingCity',
    'challengerProfile',
    'networkingOwner',
    'kenwayStatus',
    'lastInteractionDate',
    'lastInteractionOrganizer',
    'nextPlannedInteraction',
    'networkingPriority',
    'nextSteps',
    'networkingNotes'
];

const NETWORKING_PLAN_LIST_VIEWS = [
    {
        developerName: 'TMT_Networking_Plan',
        label: 'TMT Networking Plan',
        whereClause: [
            '(',
            "Networking_Plan_Association__c INCLUDES ('Technology, Media, and Telecommunications')",
            "OR Account.Industry = 'Telecommunications'",
            ')',
            'AND',
            '(',
            "Networking_Owner__r.Name LIKE '%Irene%'",
            "OR Networking_Owner__r.Name LIKE '%Clay%'",
            "OR Networking_Owner__r.Name LIKE '%Kyle%'",
            "OR Networking_Owner__r.Name LIKE '%Sarah%'",
            ')'
        ].join(' '),
        orderByClause: 'ORDER BY Name ASC NULLS LAST, Id ASC NULLS LAST',
        columnKeys: STANDARD_LIST_COLUMN_KEYS
    },
    {
        developerName: 'Healthcare_Networking_Plan',
        label: 'Healthcare Networking Plan',
        whereClause: "Networking_Plan_Association__c = 'HealthCare' OR Account.Industry = 'Healthcare'",
        orderByClause: 'ORDER BY Name ASC NULLS LAST, Id ASC NULLS LAST',
        columnKeys: STANDARD_LIST_COLUMN_KEYS
    },
    {
        developerName: 'Supply_Chain_Networking_Plan',
        label: 'Supply Chain Management Networking Plan',
        whereClause: "Networking_Plan_Association__c = 'Supply Chain Management'",
        orderByClause: 'ORDER BY Name ASC NULLS LAST, Id ASC NULLS LAST',
        columnKeys: STANDARD_LIST_COLUMN_KEYS
    },
    {
        developerName: 'Contact_Center_Networking_Plan',
        label: 'Contact Center Networking Plan',
        whereClause: "Networking_Plan_Association__c INCLUDES ('Contact Center')",
        orderByClause: 'ORDER BY Name ASC NULLS LAST, Id ASC NULLS LAST',
        columnKeys: CONTACT_CENTER_COLUMN_KEYS
    },
    {
        developerName: 'Financial_Services_Networking_Plan',
        label: 'Financial Services Networking Plan',
        whereClause: "Networking_Plan_Association__c = 'Financial Services' OR Account.Industry = 'Financial Services'",
        orderByClause: 'ORDER BY Name ASC NULLS LAST, Id ASC NULLS LAST',
        columnKeys: STANDARD_LIST_COLUMN_KEYS
    }
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

function getRequiredEnvNames() {
    if (AUTH_FLOW === 'password') {
        return [
            'SF_LOGIN_URL',
            'SF_CLIENT_ID',
            'SF_CLIENT_SECRET',
            'SF_USERNAME',
            'SF_PASSWORD',
            'SF_SECURITY_TOKEN'
        ];
    }

    return [
        'SF_LOGIN_URL',
        'SF_CLIENT_ID',
        'SF_CLIENT_SECRET'
    ];
}

function getTokenRequestParams() {
    if (AUTH_FLOW === 'password') {
        return new URLSearchParams({
            grant_type: 'password',
            client_id: readEnv('SF_CLIENT_ID'),
            client_secret: readEnv('SF_CLIENT_SECRET'),
            username: readEnv('SF_USERNAME'),
            password: readEnv('SF_PASSWORD') + readEnv('SF_SECURITY_TOKEN')
        });
    }

    if (AUTH_FLOW === 'client_credentials') {
        return new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: readEnv('SF_CLIENT_ID'),
            client_secret: readEnv('SF_CLIENT_SECRET')
        });
    }

    throw new Error(`Unsupported SF_AUTH_FLOW value: ${AUTH_FLOW}`);
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(payload));
}

function parseBoolean(value) {
    return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function readHeader(req, headerName) {
    const value = req.headers[headerName];
    if (Array.isArray(value)) {
        return value[0] || '';
    }
    return value || '';
}

function decodeClientPrincipal(encodedHeader) {
    if (!encodedHeader) {
        return null;
    }

    try {
        return JSON.parse(Buffer.from(encodedHeader, 'base64').toString('utf8'));
    } catch {
        return null;
    }
}

function getPrincipalClaimValue(principal, claimTypes) {
    if (!principal?.claims?.length) {
        return '';
    }

    for (const claimType of claimTypes) {
        const match = principal.claims.find((claim) => claim.typ === claimType && claim.val);
        if (match?.val) {
            return match.val;
        }
    }

    return '';
}

function getAuthenticatedPrincipal(req) {
    const principalHeader = readHeader(req, 'x-ms-client-principal');
    const decodedPrincipal = decodeClientPrincipal(principalHeader);
    const id = readHeader(req, 'x-ms-client-principal-id')
        || getPrincipalClaimValue(decodedPrincipal, [
            'http://schemas.microsoft.com/identity/claims/objectidentifier',
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
            'oid',
            'sub'
        ]);
    const name = readHeader(req, 'x-ms-client-principal-name')
        || getPrincipalClaimValue(decodedPrincipal, [
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
            'preferred_username',
            'email'
        ]);
    const provider = (readHeader(req, 'x-ms-client-principal-idp') || decodedPrincipal?.auth_typ || '').toLowerCase();

    if (!id && !name && !provider) {
        return null;
    }

    return {
        id,
        name,
        provider
    };
}

function enforceAppServiceAuthentication(req, pathname) {
    if (!APP_SERVICE_AUTH_REQUIRED || pathname === '/api/health') {
        return null;
    }

    const principal = getAuthenticatedPrincipal(req);
    if (!principal?.id) {
        const error = new Error('Authentication required. Sign in with your Kenway Microsoft account.');
        error.statusCode = 401;
        throw error;
    }

    if (APP_SERVICE_AUTH_ALLOWED_IDPS.size && !APP_SERVICE_AUTH_ALLOWED_IDPS.has(principal.provider)) {
        const error = new Error('Unsupported identity provider. Sign in with the configured Microsoft Entra provider.');
        error.statusCode = 403;
        throw error;
    }

    return principal;
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

    const params = getTokenRequestParams();

    const response = await fetch(`${LOGIN_URL}/services/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    const payload = await response.json();
    if (!response.ok) {
        let message = payload.error_description || payload.error || 'Salesforce login failed';
        if (AUTH_FLOW === 'password' && payload.error === 'invalid_grant') {
            message = `${message}. Check SF_USERNAME, SF_PASSWORD, SF_SECURITY_TOKEN, and confirm the Salesforce app allows OAuth Username-Password Flow.`;
        } else if (AUTH_FLOW === 'client_credentials') {
            message = `${message}. Check SF_CLIENT_ID, SF_CLIENT_SECRET, SF_LOGIN_URL, and confirm the Salesforce app has Client Credentials Flow enabled with a Run As user.`;
        }

        const error = new Error(message);
        error.statusCode = 502;
        error.details = payload;
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

function getColumnDefinitions(columnKeys) {
    return (columnKeys || [])
        .map((key) => LIST_COLUMN_CATALOG[key])
        .filter(Boolean)
        .map((definition) => ({ ...definition }));
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

async function getNetworkingPlanListViews() {
    return NETWORKING_PLAN_LIST_VIEWS.map((listView) => ({ ...listView }));
}

async function getMetadata(forceRefresh = false) {
    const cacheAge = Date.now() - cache.metadataFetchedAt;
    if (!forceRefresh && cache.metadata && cacheAge < 5 * 60 * 1000) {
        return cache.metadata;
    }

    const contactDescribe = await salesforceJson(`/services/data/${API_VERSION}/sobjects/Contact/describe`);
    const contactFieldMap = getPicklistFieldMap(contactDescribe);
    const accountDescribe = await salesforceJson(`/services/data/${API_VERSION}/sobjects/Account/describe`);
    const accountFieldMap = getPicklistFieldMap(accountDescribe);

    const picklists = {};
    for (const fieldName of PICKLIST_FIELD_NAMES) {
        const field = contactFieldMap.get(fieldName);
        picklists[fieldName] = (field?.picklistValues || [])
            .filter((entry) => entry.active)
            .map(normalizeOption);
    }

    const accountPicklists = {};
    for (const fieldName of ACCOUNT_PICKLIST_FIELD_NAMES) {
        const field = accountFieldMap.get(fieldName);
        accountPicklists[fieldName] = (field?.picklistValues || [])
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

    const listViews = await getNetworkingPlanListViews();

    cache.metadata = {
        picklists,
        accountPicklists,
        ownerOptions,
        listViews
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

function buildSearchClause(search) {
    const searchTerm = escapeLikeTerm(search.trim());
    if (!searchTerm) {
        return '';
    }

    return [
        '(',
        `Name LIKE '%${searchTerm}%'`,
        `OR Title LIKE '%${searchTerm}%'`,
        `OR Email LIKE '%${searchTerm}%'`,
        `OR MailingCity LIKE '%${searchTerm}%'`,
        `OR Account.Name LIKE '%${searchTerm}%'`,
        ')'
    ].join(' ');
}

function formatContactRow(record) {
    return {
        id: record.Id,
        name: record.Name,
        title: record.Title || '',
        email: record.Email || '',
        mailingCity: record.MailingCity || '',
        active: Boolean(record.Active__c),
        challengerProfile: record.Challenger_Profile__c || '',
        networkingOwnerId: record.Networking_Owner__c || '',
        networkingOwnerName: record.Networking_Owner__r?.Name || '',
        kenwayStatus: record.Kenway_Status__c || '',
        lastInteractionDate: record.Last_Interaction_Date__c || '',
        lastInteractionOrganizerName: record.Last_Interaction_Organizer__r?.Name || '',
        nextPlannedInteraction: record.Next_Planned_Interaction__c || '',
        networkingPriority: record.Kenway_s_Priority__c || '',
        nextSteps: record.Next_Steps__c || '',
        networkingNotes: record.Networking_Notes__c || '',
        networkingNotesShort: record.Networking_Notes_Short__c || '',
        networkingPlanAssociation: record.Networking_Plan_Association__c
            ? record.Networking_Plan_Association__c.split(';').filter(Boolean)
            : [],
        accountId: record.AccountId || '',
        accountName: record.Account?.Name || '',
        accountVertical: record.Account?.Kenway_Vertical__c || ''
    };
}

function formatAccountRow(record) {
    return {
        id: record.Id,
        name: record.Name,
        industry: record.Industry || '',
        website: record.Website || '',
        billingCity: record.BillingCity || '',
        billingState: record.BillingState || '',
        description: record.Description || '',
        annualRevenue: record.Annual_Revenue__c || '',
        targetCompany: record.Target_Company__c || '',
        vertical: record.Kenway_Vertical__c || ''
    };
}

function parsePageSize(pageSize) {
    const parsed = Number(pageSize);
    return [10, 25, 50].includes(parsed) ? parsed : 25;
}

function parsePage(page) {
    return Math.max(Number(page) || 1, 1);
}

async function getContacts({ listView, networkingOwner, search, page, pageSize }) {
    const metadata = await getMetadata();
    const listViewDefinitions = metadata.listViews || [];
    const listViewByDeveloperName = new Map(
        listViewDefinitions.map((definition) => [definition.developerName, definition])
    );
    const ownerIds = new Set(metadata.ownerOptions.map((option) => option.value));

    const size = parsePageSize(pageSize);
    const requestedPage = parsePage(page);
    const whereClauses = [];
    let orderByClause = 'ORDER BY Name ASC NULLS LAST, Id ASC NULLS LAST';

    if (listView) {
        const definition = listViewByDeveloperName.get(listView);
        if (!definition) {
            const error = new Error('Invalid networking plan list');
            error.statusCode = 400;
            throw error;
        }
        whereClauses.push(`(${definition.whereClause})`);
        orderByClause = definition.orderByClause || orderByClause;
    } else {
        whereClauses.push(
            `(${listViewDefinitions.map((definition) => `(${definition.whereClause})`).join(' OR ')})`
        );
    }

    const searchClause = search ? buildSearchClause(search) : '';
    if (searchClause) {
        whereClauses.push(searchClause);
    }

    if (networkingOwner) {
        if (!ownerIds.has(networkingOwner)) {
            const error = new Error('Invalid networking owner filter');
            error.statusCode = 400;
            throw error;
        }

        whereClauses.push(`Networking_Owner__c = '${escapeSoql(networkingOwner)}'`);
    }

    const countSoql = [
        'SELECT COUNT()',
        'FROM Contact',
        `WHERE ${whereClauses.join(' AND ')}`
    ].join(' ');

    const countResult = await querySalesforce(countSoql);
    const totalCount = Number(countResult.totalSize || 0);
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / size) : 1;
    const currentPage = Math.min(requestedPage, totalPages);
    const offset = (currentPage - 1) * size;

    const soql = [
        `SELECT ${CONTACT_SELECT_FIELDS.join(', ')}`,
        'FROM Contact',
        `WHERE ${whereClauses.join(' AND ')}`,
        orderByClause,
        `LIMIT ${size}`,
        offset > 0 ? `OFFSET ${offset}` : ''
    ].join(' ');

    const result = await querySalesforce(soql);
    return {
        records: result.records.map(formatContactRow),
        count: result.records.length,
        totalCount,
        page: currentPage,
        pageSize: size,
        totalPages
    };
}

async function searchAccounts({ search, limit }) {
    const searchTerm = (search || '').trim();
    if (!searchTerm) {
        return [];
    }

    const size = Math.min(Math.max(Number(limit) || 10, 1), 20);
    const soql = [
        'SELECT Id, Name, Industry, Kenway_Vertical__c',
        'FROM Account',
        `WHERE Name LIKE '%${escapeLikeTerm(searchTerm)}%'`,
        'ORDER BY Name ASC NULLS LAST',
        `LIMIT ${size}`
    ].join(' ');

    const result = await querySalesforce(soql);
    return result.records.map(formatAccountRow);
}

async function assertAccountExists(accountId) {
    const soql = [
        'SELECT Id',
        'FROM Account',
        `WHERE Id = '${escapeSoql(accountId)}'`,
        'LIMIT 1'
    ].join(' ');

    const result = await querySalesforce(soql);
    if (!result.records.length) {
        const error = new Error('Selected company was not found');
        error.statusCode = 400;
        throw error;
    }
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

async function getAccountById(accountId) {
    const soql = [
        `SELECT ${ACCOUNT_SELECT_FIELDS.join(', ')}`,
        'FROM Account',
        `WHERE Id = '${escapeSoql(accountId)}'`,
        'LIMIT 1'
    ].join(' ');

    const result = await querySalesforce(soql);
    if (!result.records.length) {
        const error = new Error('Company not found');
        error.statusCode = 404;
        throw error;
    }
    return formatAccountRow(result.records[0]);
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
            case 'Email':
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

async function sanitizeContactCreate(payload) {
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
        if (!CREATEABLE_FIELDS.has(fieldName)) {
            continue;
        }

        switch (fieldName) {
            case 'FirstName':
            case 'Title':
            case 'MailingCity':
            case 'Next_Steps__c':
            case 'Networking_Notes__c':
                cleaned[fieldName] = rawValue == null ? '' : String(rawValue).trim();
                break;
            case 'LastName':
                cleaned[fieldName] = rawValue == null ? '' : String(rawValue).trim();
                if (!cleaned[fieldName]) {
                    const error = new Error('Last Name is required');
                    error.statusCode = 400;
                    throw error;
                }
                break;
            case 'AccountId':
                cleaned[fieldName] = rawValue ? String(rawValue).trim() : '';
                if (!cleaned[fieldName]) {
                    const error = new Error('Company is required');
                    error.statusCode = 400;
                    throw error;
                }
                await assertAccountExists(cleaned[fieldName]);
                break;
            case 'Active__c':
                cleaned[fieldName] = rawValue === undefined ? true : Boolean(rawValue);
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

    if (!cleaned.LastName) {
        const error = new Error('Last Name is required');
        error.statusCode = 400;
        throw error;
    }

    if (!cleaned.AccountId) {
        const error = new Error('Company is required');
        error.statusCode = 400;
        throw error;
    }

    if (!Object.prototype.hasOwnProperty.call(cleaned, 'Active__c')) {
        cleaned.Active__c = true;
    }

    return cleaned;
}

async function sanitizeAccountCreate(payload) {
    const metadata = await getMetadata();
    const picklistSets = {
        Industry: new Set(metadata.accountPicklists.Industry.map((option) => option.value)),
        Annual_Revenue__c: new Set(metadata.accountPicklists.Annual_Revenue__c.map((option) => option.value)),
        Target_Company__c: new Set(metadata.accountPicklists.Target_Company__c.map((option) => option.value))
    };
    const cleaned = {};

    for (const [fieldName, rawValue] of Object.entries(payload || {})) {
        if (!ACCOUNT_CREATEABLE_FIELDS.has(fieldName)) {
            continue;
        }

        switch (fieldName) {
            case 'Name':
                cleaned[fieldName] = rawValue == null ? '' : String(rawValue).trim();
                if (!cleaned[fieldName]) {
                    const error = new Error('Company Name is required');
                    error.statusCode = 400;
                    throw error;
                }
                break;
            case 'Website':
            case 'BillingCity':
            case 'BillingState':
            case 'Description':
                cleaned[fieldName] = rawValue == null ? '' : String(rawValue).trim();
                break;
            case 'Industry':
            case 'Annual_Revenue__c':
            case 'Target_Company__c':
                cleaned[fieldName] = validateSingleValue(fieldName, rawValue, picklistSets[fieldName]);
                break;
            default:
                break;
        }
    }

    if (!cleaned.Name) {
        const error = new Error('Company Name is required');
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

async function createContact(payload) {
    const fields = await sanitizeContactCreate(payload);
    const response = await salesforceJson(`/services/data/${API_VERSION}/sobjects/Contact`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
    });

    return getContactById(response.id);
}

async function createAccount(payload) {
    const fields = await sanitizeAccountCreate(payload);
    const response = await salesforceJson(`/services/data/${API_VERSION}/sobjects/Account`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
    });

    return getAccountById(response.id);
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
    const listViewColumns = Object.fromEntries(
        metadata.listViews.map((view) => [
            view.developerName,
            getColumnDefinitions(view.columnKeys)
        ])
    );

    return {
        filters: {
            listViewOptions: metadata.listViews.map((view) => ({
                label: view.label,
                value: view.developerName
            }))
        },
        columns: {
            default: getColumnDefinitions(STANDARD_LIST_COLUMN_KEYS),
            byListView: listViewColumns
        },
        fields: {
            planAssociationOptions: metadata.picklists.Networking_Plan_Association__c,
            challengerProfileOptions: metadata.picklists.Challenger_Profile__c,
            kenwayStatusOptions: metadata.picklists.Kenway_Status__c,
            networkingPriorityOptions: metadata.picklists.Kenway_s_Priority__c,
            ownerOptions: metadata.ownerOptions,
            accountIndustryOptions: metadata.accountPicklists.Industry,
            accountAnnualRevenueOptions: metadata.accountPicklists.Annual_Revenue__c,
            accountTargetCompanyOptions: metadata.accountPicklists.Target_Company__c
        }
    };
}

async function routeApi(req, res, pathname, searchParams) {
    if (req.method === 'GET' && pathname === '/api/health') {
        const requiredEnv = getRequiredEnvNames();
        const missing = requiredEnv.filter((name) => !process.env[name]);
        const principal = getAuthenticatedPrincipal(req);
        sendJson(res, 200, {
            ok: true,
            authFlow: AUTH_FLOW,
            appServiceAuthRequired: APP_SERVICE_AUTH_REQUIRED,
            requestAuthenticated: Boolean(principal?.id),
            configComplete: missing.length === 0,
            missing
        });
        return;
    }

    enforceAppServiceAuthentication(req, pathname);

    if (req.method === 'GET' && pathname === '/api/bootstrap') {
        const metadata = await getMetadata();
        sendJson(res, 200, buildBootstrapPayload(metadata));
        return;
    }

    if (req.method === 'GET' && pathname === '/api/contacts') {
        const contacts = await getContacts({
            listView: searchParams.get('listView') || '',
            networkingOwner: searchParams.get('networkingOwner') || '',
            search: searchParams.get('search') || '',
            page: searchParams.get('page') || 1,
            pageSize: searchParams.get('pageSize') || 25
        });
        sendJson(res, 200, contacts);
        return;
    }

    if (req.method === 'GET' && pathname === '/api/accounts') {
        const accounts = await searchAccounts({
            search: searchParams.get('search') || '',
            limit: searchParams.get('limit') || 10
        });
        sendJson(res, 200, { records: accounts });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/accounts') {
        const body = await readRequestBody(req);
        const record = await createAccount(body);
        sendJson(res, 201, { record });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/contacts') {
        const body = await readRequestBody(req);
        const record = await createContact(body);
        sendJson(res, 201, { record });
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

function startServer(port = PORT) {
    return new Promise((resolve, reject) => {
        const handleError = (error) => {
            server.off('listening', handleListening);
            reject(error);
        };

        const handleListening = () => {
            server.off('error', handleError);
            resolve(server);
        };

        server.once('error', handleError);
        server.once('listening', handleListening);
        server.listen(port);
    });
}

if (require.main === module) {
    startServer()
        .then(() => {
            console.log(`Standalone networking plan app running at http://localhost:${PORT}`);
        })
        .catch((error) => {
            console.error(error.stack || String(error));
            process.exit(1);
        });
}

module.exports = {
    server,
    startServer
};
