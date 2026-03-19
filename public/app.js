const state = {
    bootstrap: null,
    contacts: [],
    selectedContactId: '',
    originalRecord: null,
    health: null
};

const elements = {
    healthStatus: document.querySelector('#healthStatus'),
    resultCount: document.querySelector('#resultCount'),
    verticalFilter: document.querySelector('#verticalFilter'),
    searchInput: document.querySelector('#searchInput'),
    refreshButton: document.querySelector('#refreshButton'),
    messageBar: document.querySelector('#messageBar'),
    contactTableBody: document.querySelector('#contactTableBody'),
    editorTitle: document.querySelector('#editorTitle'),
    editorPlaceholder: document.querySelector('#editorPlaceholder'),
    editorFields: document.querySelector('#editorFields'),
    editorForm: document.querySelector('#editorForm'),
    saveButton: document.querySelector('#saveButton'),
    resetButton: document.querySelector('#resetButton'),
    readOnlyAccount: document.querySelector('#readOnlyAccount'),
    readOnlyVertical: document.querySelector('#readOnlyVertical'),
    readOnlyLastInteraction: document.querySelector('#readOnlyLastInteraction')
};

const editorFields = Array.from(elements.editorForm.querySelectorAll('[name]'));

function showMessage(message, variant = 'info') {
    if (!message) {
        elements.messageBar.textContent = '';
        elements.messageBar.className = 'message-bar hidden';
        return;
    }

    elements.messageBar.textContent = message;
    elements.messageBar.className = `message-bar ${variant === 'error' ? 'error' : ''}`.trim();
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(options.headers || {})
        },
        ...options
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.message || 'Request failed');
    }
    return payload;
}

function formatDate(value) {
    if (!value) {
        return '-';
    }
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function buildOptions(selectElement, options, { includeBlank = true } = {}) {
    const currentValue = selectElement.value;
    selectElement.innerHTML = '';

    if (includeBlank) {
        const blankOption = document.createElement('option');
        blankOption.value = '';
        blankOption.textContent = 'None';
        selectElement.append(blankOption);
    }

    options.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        selectElement.append(opt);
    });

    selectElement.value = currentValue;
}

function initializeFilters() {
    const options = [
        { label: 'All networking plans', value: '' },
        ...(state.bootstrap?.filters?.verticalOptions || [])
    ];

    elements.verticalFilter.innerHTML = '';
    options.forEach((option) => {
        const element = document.createElement('option');
        element.value = option.value;
        element.textContent = option.label;
        elements.verticalFilter.append(element);
    });
}

function initializeEditorOptions() {
    const fieldOptions = state.bootstrap?.fields || {};
    editorFields.forEach((field) => {
        if (!(field instanceof HTMLSelectElement)) {
            return;
        }

        const sourceName = field.dataset.optionsSource;
        const options = fieldOptions[sourceName] || [];
        buildOptions(field, options, { includeBlank: !field.multiple });
    });
}

function getSelectedContact() {
    return state.contacts.find((contact) => contact.id === state.selectedContactId) || null;
}

function readFormValues() {
    const payload = {};

    editorFields.forEach((field) => {
        if (field instanceof HTMLInputElement && field.type === 'checkbox') {
            payload[field.name] = field.checked;
            return;
        }

        if (field instanceof HTMLSelectElement && field.multiple) {
            payload[field.name] = Array.from(field.selectedOptions).map((option) => option.value);
            return;
        }

        payload[field.name] = field.value;
    });

    return payload;
}

function stringifyComparable(value) {
    return JSON.stringify(value ?? null);
}

function isDirty() {
    if (!state.originalRecord) {
        return false;
    }

    const current = readFormValues();
    const comparisonPairs = [
        ['Title', state.originalRecord.title],
        ['MailingCity', state.originalRecord.mailingCity],
        ['Active__c', state.originalRecord.active],
        ['Challenger_Profile__c', state.originalRecord.challengerProfile],
        ['Networking_Owner__c', state.originalRecord.networkingOwnerId],
        ['Kenway_Status__c', state.originalRecord.kenwayStatus],
        ['Next_Planned_Interaction__c', state.originalRecord.nextPlannedInteraction],
        ['Kenway_s_Priority__c', state.originalRecord.networkingPriority],
        ['Next_Steps__c', state.originalRecord.nextSteps],
        ['Networking_Notes__c', state.originalRecord.networkingNotes],
        ['Networking_Plan_Association__c', state.originalRecord.networkingPlanAssociation]
    ];

    return comparisonPairs.some(([fieldName, originalValue]) => {
        return stringifyComparable(current[fieldName]) !== stringifyComparable(originalValue);
    });
}

function syncEditorButtons() {
    const hasSelection = Boolean(state.selectedContactId);
    elements.saveButton.disabled = !hasSelection || !isDirty();
    elements.resetButton.disabled = !hasSelection || !isDirty();
}

function populateEditor(contact) {
    state.originalRecord = contact ? { ...contact } : null;

    if (!contact) {
        elements.editorTitle.textContent = 'Select a contact';
        elements.editorPlaceholder.classList.remove('hidden');
        elements.editorFields.classList.add('hidden');
        elements.readOnlyAccount.textContent = '-';
        elements.readOnlyVertical.textContent = '-';
        elements.readOnlyLastInteraction.textContent = '-';
        editorFields.forEach((field) => {
            if (field instanceof HTMLInputElement && field.type === 'checkbox') {
                field.checked = false;
            } else if (field instanceof HTMLSelectElement && field.multiple) {
                Array.from(field.options).forEach((option) => {
                    option.selected = false;
                });
            } else {
                field.value = '';
            }
        });
        syncEditorButtons();
        return;
    }

    elements.editorTitle.textContent = contact.name;
    elements.editorPlaceholder.classList.add('hidden');
    elements.editorFields.classList.remove('hidden');
    elements.readOnlyAccount.textContent = contact.accountName || '-';
    elements.readOnlyVertical.textContent = contact.accountVertical || '-';
    elements.readOnlyLastInteraction.textContent = formatDate(contact.lastInteractionDate);

    editorFields.forEach((field) => {
        switch (field.name) {
            case 'Title':
                field.value = contact.title || '';
                break;
            case 'MailingCity':
                field.value = contact.mailingCity || '';
                break;
            case 'Active__c':
                field.checked = Boolean(contact.active);
                break;
            case 'Challenger_Profile__c':
                field.value = contact.challengerProfile || '';
                break;
            case 'Networking_Owner__c':
                field.value = contact.networkingOwnerId || '';
                break;
            case 'Kenway_Status__c':
                field.value = contact.kenwayStatus || '';
                break;
            case 'Next_Planned_Interaction__c':
                field.value = contact.nextPlannedInteraction || '';
                break;
            case 'Kenway_s_Priority__c':
                field.value = contact.networkingPriority || '';
                break;
            case 'Next_Steps__c':
                field.value = contact.nextSteps || '';
                break;
            case 'Networking_Notes__c':
                field.value = contact.networkingNotes || '';
                break;
            case 'Networking_Plan_Association__c':
                Array.from(field.options).forEach((option) => {
                    option.selected = contact.networkingPlanAssociation.includes(option.value);
                });
                break;
            default:
                break;
        }
    });

    syncEditorButtons();
}

function selectContact(contactId) {
    state.selectedContactId = contactId;
    const selected = getSelectedContact();
    populateEditor(selected);
    renderContacts();
}

function renderContacts() {
    elements.contactTableBody.innerHTML = '';
    elements.resultCount.textContent = String(state.contacts.length);

    if (!state.contacts.length) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" class="empty-state-cell">No contacts matched the current filter.</td>';
        elements.contactTableBody.append(row);
        return;
    }

    state.contacts.forEach((contact) => {
        const row = document.createElement('tr');
        row.className = `contact-row ${contact.id === state.selectedContactId ? 'selected' : ''}`.trim();
        row.addEventListener('click', () => selectContact(contact.id));
        row.innerHTML = `
            <td>
                <span class="contact-name">${contact.name}</span>
                <span class="contact-subtitle">${contact.title || 'No title'}</span>
            </td>
            <td>${contact.accountName || '-'}</td>
            <td>${contact.accountVertical || '-'}</td>
            <td>${contact.networkingOwnerName || '-'}</td>
            <td>${contact.kenwayStatus || '-'}</td>
            <td>${formatDate(contact.nextPlannedInteraction)}</td>
            <td>${formatDate(contact.lastInteractionDate)}</td>
        `;
        elements.contactTableBody.append(row);
    });
}

async function loadContacts() {
    showMessage('Loading networking plan contacts...');

    const params = new URLSearchParams({
        vertical: elements.verticalFilter.value,
        search: elements.searchInput.value.trim(),
        limit: '150'
    });

    const payload = await apiFetch(`/api/contacts?${params.toString()}`);
    state.contacts = payload.records || [];

    const selectedStillVisible = state.contacts.some((contact) => contact.id === state.selectedContactId);
    if (!selectedStillVisible) {
        state.selectedContactId = '';
    }

    renderContacts();
    populateEditor(getSelectedContact());
    showMessage('');
}

async function refreshAll() {
    try {
        showMessage('Refreshing workspace...');
        const health = await apiFetch('/api/health');

        state.health = health;

        elements.healthStatus.textContent = health.configComplete
            ? 'Connected'
            : `Missing config: ${health.missing.join(', ')}`;

        if (!health.configComplete) {
            elements.resultCount.textContent = '0';
            state.contacts = [];
            renderContacts();
            populateEditor(null);
            showMessage('Salesforce credentials are not fully configured for the standalone app.', 'error');
            return;
        }

        const bootstrap = await apiFetch('/api/bootstrap');
        state.bootstrap = bootstrap;
        initializeFilters();
        initializeEditorOptions();
        await loadContacts();
    } catch (error) {
        showMessage(error.message || 'Unable to load workspace', 'error');
        elements.healthStatus.textContent = 'Unavailable';
    }
}

async function saveContact() {
    const selected = getSelectedContact();
    if (!selected) {
        return;
    }

    try {
        elements.saveButton.disabled = true;
        showMessage(`Saving ${selected.name}...`);
        const payload = readFormValues();
        const response = await apiFetch(`/api/contacts/${selected.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        const updated = response.record;
        state.contacts = state.contacts.map((contact) => (
            contact.id === updated.id ? updated : contact
        ));

        const currentVertical = elements.verticalFilter.value;
        const stillMatchesFilter = !currentVertical
            || updated.networkingPlanAssociation.includes(currentVertical);

        if (stillMatchesFilter) {
            selectContact(updated.id);
        } else {
            state.selectedContactId = '';
            populateEditor(null);
        }

        await loadContacts();
        showMessage(`${updated.name} was updated successfully.`);
    } catch (error) {
        showMessage(error.message || 'Unable to save contact', 'error');
    } finally {
        syncEditorButtons();
    }
}

function resetEditor() {
    populateEditor(getSelectedContact());
    showMessage('Changes reset.');
}

let searchTimer = null;

elements.refreshButton.addEventListener('click', () => {
    refreshAll();
});

elements.verticalFilter.addEventListener('change', () => {
    loadContacts().catch((error) => showMessage(error.message, 'error'));
});

elements.searchInput.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
        loadContacts().catch((error) => showMessage(error.message, 'error'));
    }, 300);
});

elements.saveButton.addEventListener('click', () => {
    saveContact();
});

elements.resetButton.addEventListener('click', () => {
    resetEditor();
});

editorFields.forEach((field) => {
    field.addEventListener('input', syncEditorButtons);
    field.addEventListener('change', syncEditorButtons);
});

refreshAll();
