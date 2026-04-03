const FALLBACK_STANDARD_COLUMNS = [
    { key: 'name', label: 'Name', type: 'text', editable: false },
    { key: 'accountName', label: 'Company Name', type: 'text', editable: false },
    { key: 'title', label: 'Title', type: 'text', editable: true, updateField: 'Title' },
    {
        key: 'networkingPlanAssociation',
        label: 'Networking Plan Association',
        type: 'multiselect',
        editable: true,
        updateField: 'Networking_Plan_Association__c',
        optionsSource: 'planAssociationOptions'
    },
    { key: 'email', label: 'Email', type: 'text', editable: true, updateField: 'Email' },
    { key: 'mailingCity', label: 'Mailing City', type: 'text', editable: true, updateField: 'MailingCity' },
    {
        key: 'challengerProfile',
        label: 'Challenger Profile',
        type: 'select',
        editable: true,
        updateField: 'Challenger_Profile__c',
        optionsSource: 'challengerProfileOptions'
    },
    {
        key: 'networkingOwnerId',
        displayKey: 'networkingOwnerName',
        label: 'Networking Owner',
        type: 'select',
        editable: true,
        updateField: 'Networking_Owner__c',
        optionsSource: 'ownerOptions'
    },
    {
        key: 'kenwayStatus',
        label: 'Relationship Status',
        type: 'select',
        editable: true,
        updateField: 'Kenway_Status__c',
        optionsSource: 'kenwayStatusOptions'
    },
    { key: 'lastInteractionDate', label: 'Last Interaction Date', type: 'date', editable: false },
    { key: 'lastInteractionOrganizerName', label: 'Last Interaction Organizer', type: 'text', editable: false },
    {
        key: 'nextPlannedInteraction',
        label: 'Next Planned Interaction',
        type: 'date',
        editable: false
    },
    {
        key: 'networkingPriority',
        label: 'Networking Priority',
        type: 'select',
        editable: true,
        updateField: 'Kenway_s_Priority__c',
        optionsSource: 'networkingPriorityOptions'
    },
    { key: 'nextSteps', label: 'Next Steps', type: 'textarea', editable: true, updateField: 'Next_Steps__c' },
    { key: 'networkingNotes', label: 'Networking Notes', type: 'textarea', editable: true, updateField: 'Networking_Notes__c' }
];

const FALLBACK_CONTACT_CENTER_COLUMNS = FALLBACK_STANDARD_COLUMNS.filter(
    (column) => column.key !== 'networkingPlanAssociation'
);

const FALLBACK_COLUMNS = {
    default: FALLBACK_STANDARD_COLUMNS,
    byListView: {
        TMT_Networking_Plan: FALLBACK_STANDARD_COLUMNS,
        Healthcare_Networking_Plan: FALLBACK_STANDARD_COLUMNS,
        Supply_Chain_Networking_Plan: FALLBACK_STANDARD_COLUMNS,
        Financial_Services_Networking_Plan: FALLBACK_STANDARD_COLUMNS,
        Contact_Center_Networking_Plan: FALLBACK_CONTACT_CENTER_COLUMNS
    }
};

const COLUMN_OVERRIDES = {
    name: { width: '9rem' },
    accountName: { width: '12.5rem' },
    title: { width: '10rem' },
    networkingPlanAssociation: { width: '12.5rem' },
    email: { width: '14rem' },
    mailingCity: { width: '7.5rem' },
    challengerProfile: { width: '9rem' },
    networkingOwnerId: { label: 'Networking Owner', width: '9.5rem' },
    kenwayStatus: { width: '8.75rem' },
    lastInteractionDate: { width: '8rem' },
    lastInteractionOrganizerName: { width: '10.5rem' },
    nextPlannedInteraction: { width: '8.75rem' },
    networkingPriority: { width: '8rem' },
    nextSteps: { width: '14rem' },
    networkingNotes: { width: '15rem' }
};

const state = {
    bootstrap: null,
    contacts: [],
    contactCache: new Map(),
    health: null,
    drafts: new Map(),
    savingRows: new Set(),
    isSavingAll: false,
    page: 1,
    pageSize: 25,
    totalCount: 0,
    totalPages: 1,
    activeView: 'plans',
    selectedAccount: null,
    accountSearchResults: [],
    accountSearchRequestId: 0,
    isCreating: false,
    isCreatingAccount: false,
    floatingScrollbarSyncing: false
};

const elements = {
    plansTab: document.querySelector('#plansTab'),
    addContactTab: document.querySelector('#addContactTab'),
    addAccountTab: document.querySelector('#addAccountTab'),
    plansView: document.querySelector('#plansView'),
    addContactView: document.querySelector('#addContactView'),
    addAccountView: document.querySelector('#addAccountView'),
    resultCount: document.querySelector('#resultCount'),
    verticalFilter: document.querySelector('#verticalFilter'),
    networkingOwnerFilter: document.querySelector('#networkingOwnerFilter'),
    searchInput: document.querySelector('#searchInput'),
    pageSizeSelect: document.querySelector('#pageSizeSelect'),
    refreshButton: document.querySelector('#refreshButton'),
    messageBar: document.querySelector('#messageBar'),
    pageSummary: document.querySelector('#pageSummary'),
    prevPageButton: document.querySelector('#prevPageButton'),
    nextPageButton: document.querySelector('#nextPageButton'),
    paginationStatus: document.querySelector('#paginationStatus'),
    saveAllButton: document.querySelector('#saveAllButton'),
    tableWrap: document.querySelector('.table-wrap'),
    tableScrollY: document.querySelector('.table-scroll-y'),
    floatingScrollbar: document.querySelector('#floatingScrollbar'),
    floatingScrollbarContent: document.querySelector('#floatingScrollbarContent'),
    contactTable: document.querySelector('.contact-table'),
    contactTableHead: document.querySelector('#contactTableHead'),
    contactTableBody: document.querySelector('#contactTableBody'),
    createMessageBar: document.querySelector('#createMessageBar'),
    createContactForm: document.querySelector('#createContactForm'),
    createFirstName: document.querySelector('#createFirstName'),
    createLastName: document.querySelector('#createLastName'),
    accountSearchInput: document.querySelector('#accountSearchInput'),
    selectedAccount: document.querySelector('#selectedAccount'),
    accountSearchResults: document.querySelector('#accountSearchResults'),
    createTitle: document.querySelector('#createTitle'),
    createMailingCity: document.querySelector('#createMailingCity'),
    createNetworkingOwner: document.querySelector('#createNetworkingOwner'),
    createKenwayStatus: document.querySelector('#createKenwayStatus'),
    createChallengerProfile: document.querySelector('#createChallengerProfile'),
    createNetworkingPriority: document.querySelector('#createNetworkingPriority'),
    createActive: document.querySelector('#createActive'),
    createPlanAssociation: document.querySelector('#createPlanAssociation'),
    createNextSteps: document.querySelector('#createNextSteps'),
    createNetworkingNotes: document.querySelector('#createNetworkingNotes'),
    createSubmitButton: document.querySelector('#createSubmitButton'),
    createClearButton: document.querySelector('#createClearButton'),
    createAccountMessageBar: document.querySelector('#createAccountMessageBar'),
    createAccountForm: document.querySelector('#createAccountForm'),
    createAccountName: document.querySelector('#createAccountName'),
    createAccountIndustry: document.querySelector('#createAccountIndustry'),
    createAccountAnnualRevenue: document.querySelector('#createAccountAnnualRevenue'),
    createAccountTargetCompany: document.querySelector('#createAccountTargetCompany'),
    createAccountWebsite: document.querySelector('#createAccountWebsite'),
    createAccountBillingCity: document.querySelector('#createAccountBillingCity'),
    createAccountBillingState: document.querySelector('#createAccountBillingState'),
    createAccountDescription: document.querySelector('#createAccountDescription'),
    createAccountSubmitButton: document.querySelector('#createAccountSubmitButton'),
    createAccountClearButton: document.querySelector('#createAccountClearButton')
};

function showScopedMessage(element, message, variant = 'info') {
    if (!element) {
        return;
    }

    if (!message) {
        element.textContent = '';
        element.className = 'message-bar hidden';
        return;
    }

    element.textContent = message;
    element.className = `message-bar${variant === 'error' ? ' error' : ''}`;
}

function showMessage(message, variant = 'info') {
    showScopedMessage(elements.messageBar, message, variant);
}

function showCreateMessage(message, variant = 'info') {
    showScopedMessage(elements.createMessageBar, message, variant);
}

function showAccountMessage(message, variant = 'info') {
    showScopedMessage(elements.createAccountMessageBar, message, variant);
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

function normalizeArray(value) {
    return Array.isArray(value) ? [...value].sort() : [];
}

function valuesEqual(left, right) {
    if (Array.isArray(left) || Array.isArray(right)) {
        return JSON.stringify(normalizeArray(left)) === JSON.stringify(normalizeArray(right));
    }

    return String(left ?? '') === String(right ?? '');
}

function cloneValue(value) {
    return Array.isArray(value) ? [...value] : value;
}

function normalizeColumnDefinition(column) {
    if (!column) {
        return column;
    }

    const override = COLUMN_OVERRIDES[column.key] || {};

    if (column.key === 'nextPlannedInteraction') {
        return {
            ...column,
            ...override,
            editable: false,
            updateField: undefined
        };
    }

    return {
        ...column,
        ...override
    };
}

function getColumnConfig() {
    const bootstrapColumns = state.bootstrap?.columns;
    if (!bootstrapColumns) {
        return {
            default: FALLBACK_COLUMNS.default.map(normalizeColumnDefinition),
            byListView: Object.fromEntries(
                Object.entries(FALLBACK_COLUMNS.byListView).map(([key, columns]) => [
                    key,
                    columns.map(normalizeColumnDefinition)
                ])
            )
        };
    }

    return {
        default: (bootstrapColumns.default?.length ? bootstrapColumns.default : FALLBACK_COLUMNS.default)
            .map(normalizeColumnDefinition),
        byListView: {
            ...Object.fromEntries(
                Object.entries(FALLBACK_COLUMNS.byListView).map(([key, columns]) => [
                    key,
                    columns.map(normalizeColumnDefinition)
                ])
            ),
            ...Object.fromEntries(
                Object.entries(bootstrapColumns.byListView || {}).map(([key, columns]) => [
                    key,
                    columns.map(normalizeColumnDefinition)
                ])
            )
        }
    };
}

function getCurrentColumns() {
    const columnConfig = getColumnConfig();
    const listView = elements.verticalFilter.value;
    if (listView) {
        return columnConfig.byListView[listView] || columnConfig.default;
    }

    return columnConfig.default;
}

function getFieldOptions(optionsSource) {
    return state.bootstrap?.fields?.[optionsSource] || [];
}

function rememberContacts(contacts) {
    contacts.forEach((contact) => {
        state.contactCache.set(contact.id, contact);
    });
}

function getContactById(contactId) {
    return state.contacts.find((contact) => contact.id === contactId) || state.contactCache.get(contactId) || null;
}

function getDraft(contactId) {
    return state.drafts.get(contactId) || {};
}

function getContactValue(contact, column) {
    return cloneValue(contact[column.key]);
}

function getCurrentValue(contact, column) {
    const draft = getDraft(contact.id);
    if (column.updateField && Object.prototype.hasOwnProperty.call(draft, column.updateField)) {
        return cloneValue(draft[column.updateField]);
    }

    return getContactValue(contact, column);
}

function updateDraft(contact, column, nextValue) {
    if (!column.updateField) {
        return;
    }

    const draft = { ...getDraft(contact.id) };
    const originalValue = getContactValue(contact, column);

    if (valuesEqual(nextValue, originalValue)) {
        delete draft[column.updateField];
    } else {
        draft[column.updateField] = cloneValue(nextValue);
    }

    if (Object.keys(draft).length) {
        state.drafts.set(contact.id, draft);
    } else {
        state.drafts.delete(contact.id);
    }

    updatePaginationUI();
}

function isRowDirty(contactId) {
    return Boolean(Object.keys(getDraft(contactId)).length);
}

function getDirtyCount() {
    return state.drafts.size;
}

function buildOptions(
    selectElement,
    options,
    value,
    { includeBlank = true, multiple = false, blankLabel = 'None' } = {}
) {
    selectElement.innerHTML = '';

    if (includeBlank && !multiple) {
        const blankOption = document.createElement('option');
        blankOption.value = '';
        blankOption.textContent = blankLabel;
        selectElement.append(blankOption);
    }

    options.forEach((option) => {
        const element = document.createElement('option');
        element.value = option.value;
        element.textContent = option.label;
        selectElement.append(element);
    });

    if (multiple) {
        const selectedValues = new Set(Array.isArray(value) ? value : []);
        Array.from(selectElement.options).forEach((option) => {
            option.selected = selectedValues.has(option.value);
        });
        return;
    }

    selectElement.value = value ?? '';
}

function getSelectedValues(selectElement) {
    return Array.from(selectElement.selectedOptions || []).map((option) => option.value);
}

function applyColumnSizing(cell, column) {
    if (!column?.width) {
        return;
    }

    cell.style.width = column.width;
    cell.style.minWidth = column.width;
}

function syncFloatingScrollbar() {
    if (!elements.tableWrap || !elements.contactTable) {
        return;
    }

    window.requestAnimationFrame(() => {
        const scroller = elements.tableWrap;
        const tableWidth = Math.max(
            elements.contactTable.scrollWidth || 0,
            scroller.clientWidth
        );

        if (!elements.floatingScrollbar || !elements.floatingScrollbarContent) {
            return;
        }

        const tableWrapRect = scroller.getBoundingClientRect();
        const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
        const hasHorizontalOverflow = tableWidth - scroller.clientWidth > 4;
        const hasVerticalOverflow = scroller.scrollHeight - scroller.clientHeight > 4;
        const isScrollBodyVisible = tableWrapRect.top < viewportBottom && tableWrapRect.bottom > 0;
        const nativeHorizontalBarReachable = !hasVerticalOverflow
            || (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2);
        const shouldShowFloatingBar = state.activeView === 'plans'
            && hasHorizontalOverflow
            && isScrollBodyVisible
            && !nativeHorizontalBarReachable;

        elements.floatingScrollbar.classList.toggle('hidden', !shouldShowFloatingBar);
        elements.floatingScrollbarContent.style.width = `${tableWidth}px`;

        if (!shouldShowFloatingBar) {
            return;
        }

        const left = Math.max(tableWrapRect.left, 12);
        const availableWidth = Math.max(window.innerWidth - left - 12, 0);
        const width = Math.min(tableWrapRect.width, availableWidth);

        elements.floatingScrollbar.style.left = `${left}px`;
        elements.floatingScrollbar.style.width = `${width}px`;
        state.floatingScrollbarSyncing = true;
        elements.floatingScrollbar.scrollLeft = scroller.scrollLeft;
        state.floatingScrollbarSyncing = false;
    });
}

function getOptionLabel(optionsSource, value) {
    return getFieldOptions(optionsSource).find((option) => option.value === value)?.label || value;
}

function formatMultiSelectSummary(values, optionsSource) {
    if (!Array.isArray(values) || values.length === 0) {
        return 'Select associations';
    }

    const labels = values.map((value) => getOptionLabel(optionsSource, value));
    if (labels.length <= 2) {
        return labels.join(', ');
    }

    return `${labels.length} selected`;
}

function closeOpenMultiSelectDropdowns(exceptDropdown = null) {
    document.querySelectorAll('.multi-select-dropdown[open]').forEach((dropdown) => {
        if (dropdown === exceptDropdown) {
            return;
        }

        dropdown.open = false;
    });
}

function setActiveView(viewName) {
    state.activeView = viewName;

    const isPlans = viewName === 'plans';
    const isAddContact = viewName === 'add-contact';
    const isAddAccount = viewName === 'add-account';

    elements.plansTab.classList.toggle('is-active', isPlans);
    elements.addContactTab.classList.toggle('is-active', isAddContact);
    elements.addAccountTab.classList.toggle('is-active', isAddAccount);
    elements.plansView.classList.toggle('hidden', !isPlans);
    elements.addContactView.classList.toggle('hidden', !isAddContact);
    elements.addAccountView.classList.toggle('hidden', !isAddAccount);

    if (isAddContact || isAddAccount) {
        populateCreateFormOptions();
    }

    syncFloatingScrollbar();
}

function populateCreateFormOptions() {
    buildOptions(
        elements.createNetworkingOwner,
        getFieldOptions('ownerOptions'),
        elements.createNetworkingOwner.value,
        { includeBlank: true }
    );
    buildOptions(
        elements.createKenwayStatus,
        getFieldOptions('kenwayStatusOptions'),
        elements.createKenwayStatus.value,
        { includeBlank: true }
    );
    buildOptions(
        elements.createChallengerProfile,
        getFieldOptions('challengerProfileOptions'),
        elements.createChallengerProfile.value,
        { includeBlank: true }
    );
    buildOptions(
        elements.createNetworkingPriority,
        getFieldOptions('networkingPriorityOptions'),
        elements.createNetworkingPriority.value,
        { includeBlank: true }
    );
    buildOptions(
        elements.createPlanAssociation,
        getFieldOptions('planAssociationOptions'),
        getSelectedValues(elements.createPlanAssociation),
        { includeBlank: false, multiple: true }
    );
    buildOptions(
        elements.createAccountIndustry,
        getFieldOptions('accountIndustryOptions'),
        elements.createAccountIndustry.value,
        { includeBlank: true }
    );
    buildOptions(
        elements.createAccountAnnualRevenue,
        getFieldOptions('accountAnnualRevenueOptions'),
        elements.createAccountAnnualRevenue.value,
        { includeBlank: true }
    );
    buildOptions(
        elements.createAccountTargetCompany,
        getFieldOptions('accountTargetCompanyOptions'),
        elements.createAccountTargetCompany.value,
        { includeBlank: true }
    );
}

function populatePlanFilterOptions() {
    const currentListView = elements.verticalFilter.value;
    const currentOwner = elements.networkingOwnerFilter.value;

    elements.verticalFilter.innerHTML = '';

    const listViewOptions = [
        { label: 'All configured networking plans', value: '' },
        ...(state.bootstrap?.filters?.listViewOptions || [])
    ];

    listViewOptions.forEach((option) => {
        const element = document.createElement('option');
        element.value = option.value;
        element.textContent = option.label;
        elements.verticalFilter.append(element);
    });

    if (listViewOptions.some((option) => option.value === currentListView)) {
        elements.verticalFilter.value = currentListView;
    }

    buildOptions(
        elements.networkingOwnerFilter,
        getFieldOptions('ownerOptions'),
        currentOwner,
        { includeBlank: true, blankLabel: 'All networking owners' }
    );
}

function renderSelectedAccount() {
    elements.selectedAccount.innerHTML = '';

    if (!state.selectedAccount) {
        elements.selectedAccount.classList.add('hidden');
        return;
    }

    const accountName = document.createElement('strong');
    accountName.textContent = state.selectedAccount.name;

    const details = [state.selectedAccount.industry, state.selectedAccount.vertical].filter(Boolean).join(' | ');
    const accountMeta = document.createElement('span');
    accountMeta.textContent = details || 'Selected company';

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.textContent = 'Change';
    clearButton.addEventListener('click', () => {
        state.selectedAccount = null;
        elements.accountSearchInput.value = '';
        state.accountSearchResults = [];
        renderSelectedAccount();
        renderAccountSearchResults();
        elements.accountSearchInput.focus();
    });

    elements.selectedAccount.append(accountName, accountMeta, clearButton);
    elements.selectedAccount.classList.remove('hidden');
}

function selectAccount(account) {
    state.selectedAccount = account;
    elements.accountSearchInput.value = account?.name || '';
    state.accountSearchResults = [];
    renderSelectedAccount();
    renderAccountSearchResults();
}

function renderAccountSearchResults() {
    elements.accountSearchResults.innerHTML = '';

    if (state.selectedAccount || !state.accountSearchResults.length) {
        elements.accountSearchResults.classList.add('hidden');
        return;
    }

    const fragment = document.createDocumentFragment();

    state.accountSearchResults.forEach((account) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-result';
        button.addEventListener('click', () => {
            selectAccount(account);
        });

        const title = document.createElement('strong');
        title.textContent = account.name;

        const meta = document.createElement('span');
        meta.className = 'search-result-meta';
        meta.textContent = [account.industry, account.vertical].filter(Boolean).join(' | ') || 'Company';

        button.append(title, meta);
        fragment.append(button);
    });

    elements.accountSearchResults.append(fragment);
    elements.accountSearchResults.classList.remove('hidden');
}

function syncCreateFormState() {
    const disabled = state.isCreating;
    elements.createSubmitButton.disabled = disabled;
    elements.createClearButton.disabled = disabled;
    elements.accountSearchInput.disabled = disabled;
}

function syncCreateAccountFormState() {
    const disabled = state.isCreatingAccount;
    elements.createAccountSubmitButton.disabled = disabled;
    elements.createAccountClearButton.disabled = disabled;
}

function resetCreateForm({ preserveMessage = false } = {}) {
    elements.createContactForm.reset();
    elements.createActive.checked = true;
    state.selectedAccount = null;
    state.accountSearchResults = [];
    elements.accountSearchInput.value = '';
    renderSelectedAccount();
    renderAccountSearchResults();
    populateCreateFormOptions();
    if (!preserveMessage) {
        showCreateMessage('');
    }
}

function resetCreateAccountForm({ preserveMessage = false } = {}) {
    elements.createAccountForm.reset();
    populateCreateFormOptions();
    if (!preserveMessage) {
        showAccountMessage('');
    }
}

function buildCreatePayload() {
    return {
        FirstName: elements.createFirstName.value.trim(),
        LastName: elements.createLastName.value.trim(),
        AccountId: state.selectedAccount?.id || '',
        Title: elements.createTitle.value.trim(),
        MailingCity: elements.createMailingCity.value.trim(),
        Networking_Owner__c: elements.createNetworkingOwner.value,
        Kenway_Status__c: elements.createKenwayStatus.value,
        Challenger_Profile__c: elements.createChallengerProfile.value,
        Kenway_s_Priority__c: elements.createNetworkingPriority.value,
        Active__c: elements.createActive.checked,
        Networking_Plan_Association__c: getSelectedValues(elements.createPlanAssociation),
        Next_Steps__c: elements.createNextSteps.value.trim(),
        Networking_Notes__c: elements.createNetworkingNotes.value.trim()
    };
}

function buildCreateAccountPayload() {
    return {
        Name: elements.createAccountName.value.trim(),
        Industry: elements.createAccountIndustry.value,
        Annual_Revenue__c: elements.createAccountAnnualRevenue.value,
        Target_Company__c: elements.createAccountTargetCompany.value,
        Website: elements.createAccountWebsite.value.trim(),
        BillingCity: elements.createAccountBillingCity.value.trim(),
        BillingState: elements.createAccountBillingState.value.trim(),
        Description: elements.createAccountDescription.value.trim()
    };
}

async function loadAccountResults(searchTerm) {
    const trimmedSearch = searchTerm.trim();
    const requestId = ++state.accountSearchRequestId;

    if (trimmedSearch.length < 2) {
        state.accountSearchResults = [];
        renderAccountSearchResults();
        return;
    }

    try {
        const params = new URLSearchParams({
            search: trimmedSearch,
            limit: '8'
        });
        const payload = await apiFetch(`/api/accounts?${params.toString()}`);

        if (requestId !== state.accountSearchRequestId) {
            return;
        }

        state.accountSearchResults = payload.records || [];
        renderAccountSearchResults();
    } catch (error) {
        if (requestId !== state.accountSearchRequestId) {
            return;
        }

        state.accountSearchResults = [];
        renderAccountSearchResults();
        showCreateMessage(error.message || 'Unable to search companies', 'error');
    }
}

function createReadOnlyCell(contact, column) {
    const wrapper = document.createElement('div');
    wrapper.className = 'inline-readonly';

    let value = contact[column.key];
    if (column.type === 'date') {
        value = formatDate(value);
    } else if (Array.isArray(value)) {
        value = value.join(', ');
    } else if (!value) {
        value = '-';
    }

    if (column.key === 'name') {
        wrapper.classList.add('cell-strong');
    }

    wrapper.textContent = value;
    return wrapper;
}

function createEditableControl(contact, column, rowState) {
    const currentValue = getCurrentValue(contact, column);

    if (column.type === 'text') {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-input';
        input.value = currentValue || '';
        input.addEventListener('input', () => {
            updateDraft(contact, column, input.value);
            syncRowActions(contact.id, rowState);
        });
        return input;
    }

    if (column.type === 'textarea') {
        const textarea = document.createElement('textarea');
        textarea.className = 'inline-textarea';
        textarea.rows = 1;
        textarea.value = currentValue || '';
        textarea.addEventListener('focus', () => {
            textarea.classList.add('is-expanded');
        });
        textarea.addEventListener('blur', () => {
            textarea.classList.remove('is-expanded');
        });
        textarea.addEventListener('input', () => {
            updateDraft(contact, column, textarea.value);
            syncRowActions(contact.id, rowState);
        });
        return textarea;
    }

    if (column.type === 'select') {
        const select = document.createElement('select');
        select.className = 'inline-select';
        buildOptions(select, getFieldOptions(column.optionsSource), currentValue, {
            includeBlank: true
        });
        select.addEventListener('change', () => {
            updateDraft(contact, column, select.value);
            syncRowActions(contact.id, rowState);
        });
        return select;
    }

    if (column.type === 'multiselect') {
        const selectedValues = new Set(Array.isArray(currentValue) ? currentValue : []);
        const wrapper = document.createElement('details');
        wrapper.className = 'multi-select-dropdown';
        wrapper.addEventListener('toggle', () => {
            if (wrapper.open) {
                closeOpenMultiSelectDropdowns(wrapper);
            }
        });

        const trigger = document.createElement('summary');
        trigger.className = 'multi-select-trigger';

        const triggerText = document.createElement('span');
        triggerText.className = 'multi-select-summary';
        triggerText.textContent = formatMultiSelectSummary([...selectedValues], column.optionsSource);

        const triggerCaret = document.createElement('span');
        triggerCaret.className = 'multi-select-caret';
        triggerCaret.textContent = 'v';

        trigger.append(triggerText, triggerCaret);

        const menu = document.createElement('div');
        menu.className = 'multi-select-menu';

        getFieldOptions(column.optionsSource).forEach((option) => {
            const label = document.createElement('label');
            label.className = 'multi-select-option';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option.value;
            checkbox.checked = selectedValues.has(option.value);

            const text = document.createElement('span');
            text.textContent = option.label;

            checkbox.addEventListener('change', () => {
                const values = Array.from(menu.querySelectorAll('input:checked')).map((input) => input.value);
                updateDraft(contact, column, values);
                triggerText.textContent = formatMultiSelectSummary(values, column.optionsSource);
                syncRowActions(contact.id, rowState);
            });

            label.append(checkbox, text);
            menu.append(label);
        });

        wrapper.append(trigger, menu);
        return wrapper;
    }

    return createReadOnlyCell(contact, column);
}

function syncRowActions(contactId, rowState) {
    const dirty = isRowDirty(contactId);
    const saving = state.savingRows.has(contactId);

    rowState.row?.classList.toggle('is-dirty', dirty);
    rowState.row?.classList.toggle('is-saving', saving);
    rowState.saveButton.disabled = !dirty || saving || state.isSavingAll;
    rowState.resetButton.disabled = !dirty || saving || state.isSavingAll;
    rowState.status.textContent = saving ? 'Saving...' : '';
}

function renderTableHead() {
    elements.contactTableHead.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const row = document.createElement('tr');
    getCurrentColumns().forEach((column) => {
        const th = document.createElement('th');
        th.textContent = column.label;
        applyColumnSizing(th, column);
        row.append(th);
    });

    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Actions';
    actionsHeader.className = 'actions-column';
    row.append(actionsHeader);

    fragment.append(row);
    elements.contactTableHead.append(fragment);
}

function renderContacts() {
    elements.contactTableBody.innerHTML = '';

    const columns = getCurrentColumns();
    if (!state.contacts.length) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="${columns.length + 1}" class="empty-state-cell">No contacts matched the current filter.</td>`;
        elements.contactTableBody.append(row);
        return;
    }

    const fragment = document.createDocumentFragment();

    state.contacts.forEach((contact) => {
        const row = document.createElement('tr');
        row.className = 'contact-row';

        const rowState = { row };

        columns.forEach((column) => {
            const cell = document.createElement('td');
            cell.className = column.editable ? 'editable-cell' : 'readonly-cell';
            applyColumnSizing(cell, column);
            const content = column.editable
                ? createEditableControl(contact, column, rowState)
                : createReadOnlyCell(contact, column);
            cell.append(content);
            row.append(cell);
        });

        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';

        const actions = document.createElement('div');
        actions.className = 'row-actions';

        const status = document.createElement('span');
        status.className = 'row-status';

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'primary-button compact-button row-save';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', () => saveRow(contact.id));

        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.className = 'ghost-button compact-button row-reset';
        resetButton.textContent = 'Reset';
        resetButton.addEventListener('click', () => resetRow(contact.id));

        actions.append(status, saveButton, resetButton);
        actionsCell.append(actions);
        row.append(actionsCell);

        rowState.saveButton = saveButton;
        rowState.resetButton = resetButton;
        rowState.status = status;
        syncRowActions(contact.id, rowState);

        fragment.append(row);
    });

    elements.contactTableBody.append(fragment);
}

function updatePaginationUI() {
    const totalCount = state.totalCount;
    const start = totalCount > 0 ? ((state.page - 1) * state.pageSize) + 1 : 0;
    const end = totalCount > 0 ? start + state.contacts.length - 1 : 0;

    elements.resultCount.textContent = `${totalCount} contact${totalCount === 1 ? '' : 's'}`;
    elements.pageSummary.textContent = `Showing ${start}-${end} of ${totalCount} contacts`;
    elements.paginationStatus.textContent = `Page ${state.page} of ${state.totalPages}`;
    elements.prevPageButton.disabled = state.page <= 1 || state.isSavingAll;
    elements.nextPageButton.disabled = state.page >= state.totalPages || state.isSavingAll;

    const dirtyCount = getDirtyCount();
    elements.saveAllButton.disabled = dirtyCount === 0 || state.isSavingAll || state.savingRows.size > 0;
    elements.saveAllButton.textContent = state.isSavingAll
        ? 'Saving all changes...'
        : dirtyCount > 0
            ? `Save All Changes (${dirtyCount})`
            : 'Save All Changes';

    syncFloatingScrollbar();
}

function replaceContact(updated) {
    state.contactCache.set(updated.id, updated);
    state.contacts = state.contacts.map((entry) => (entry.id === updated.id ? updated : entry));
}

async function loadContacts({ preserveMessage = false, showLoading = true } = {}) {
    if (showLoading) {
        showMessage('Loading networking plans...');
    }

    const params = new URLSearchParams({
        listView: elements.verticalFilter.value,
        networkingOwner: elements.networkingOwnerFilter.value,
        search: elements.searchInput.value.trim(),
        page: String(state.page),
        pageSize: String(state.pageSize)
    });

    const payload = await apiFetch(`/api/contacts?${params.toString()}`);
    state.contacts = payload.records || [];
    rememberContacts(state.contacts);
    state.page = Number(payload.page) || state.page;
    state.pageSize = Number(payload.pageSize) || state.pageSize;
    state.totalCount = Number(payload.totalCount ?? payload.count ?? state.contacts.length);
    state.totalPages = Math.max(
        Number(payload.totalPages) || Math.ceil(Math.max(state.totalCount, 1) / state.pageSize),
        1
    );
    elements.pageSizeSelect.value = String(state.pageSize);

    renderTableHead();
    renderContacts();
    updatePaginationUI();

    if (!preserveMessage) {
        showMessage('');
    }
}

async function refreshAll() {
    try {
        showMessage('Refreshing workspace...');
        const health = await apiFetch('/api/health');
        state.health = health;

        if (!health.configComplete) {
            state.contacts = [];
            state.totalCount = 0;
            state.totalPages = 1;
            renderTableHead();
            renderContacts();
            updatePaginationUI();
            showMessage('Salesforce credentials are not fully configured for the standalone app.', 'error');
            showCreateMessage('Salesforce credentials are not fully configured for the standalone app.', 'error');
            showAccountMessage('Salesforce credentials are not fully configured for the standalone app.', 'error');
            return;
        }

        const bootstrap = await apiFetch('/api/bootstrap');
        state.bootstrap = bootstrap;
        populatePlanFilterOptions();
        populateCreateFormOptions();
        await loadContacts({ preserveMessage: true, showLoading: false });
        showMessage('');
        if (!elements.createMessageBar.textContent.includes('created successfully')) {
            showCreateMessage('');
        }
        if (!elements.createAccountMessageBar.textContent.includes('created successfully')) {
            showAccountMessage('');
        }
    } catch (error) {
        showMessage(error.message || 'Unable to load workspace', 'error');
        showCreateMessage(error.message || 'Unable to load workspace', 'error');
        showAccountMessage(error.message || 'Unable to load workspace', 'error');
    }
}

async function persistDraft(contactId, { render = true } = {}) {
    const contact = getContactById(contactId);
    const draft = getDraft(contactId);

    if (!Object.keys(draft).length) {
        return null;
    }

    try {
        state.savingRows.add(contactId);
        if (render) {
            renderContacts();
            updatePaginationUI();
        }

        const response = await apiFetch(`/api/contacts/${contactId}`, {
            method: 'PATCH',
            body: JSON.stringify(draft)
        });

        const updated = response.record;
        state.drafts.delete(contactId);
        replaceContact(updated);
        return updated;
    } catch (error) {
        error.contactName = contact?.name || contactId;
        throw error;
    } finally {
        state.savingRows.delete(contactId);
        if (render) {
            renderContacts();
            updatePaginationUI();
        }
    }
}

async function saveRow(contactId) {
    const contact = getContactById(contactId);
    if (!contact || !Object.keys(getDraft(contactId)).length) {
        return;
    }

    try {
        showMessage(`Saving ${contact.name}...`);
        const updated = await persistDraft(contactId);
        await loadContacts({ preserveMessage: true, showLoading: false });
        showMessage(`${updated.name} was updated successfully.`);
    } catch (error) {
        showMessage(error.message || 'Unable to save contact', 'error');
    }
}

async function saveAllRows() {
    const dirtyIds = Array.from(state.drafts.keys()).filter((contactId) => isRowDirty(contactId));
    if (!dirtyIds.length) {
        return;
    }

    state.isSavingAll = true;
    renderContacts();
    updatePaginationUI();

    try {
        showMessage(`Saving ${dirtyIds.length} contact updates...`);
        const failures = [];

        for (const contactId of dirtyIds) {
            try {
                await persistDraft(contactId, { render: false });
            } catch (error) {
                failures.push(error);
            }
        }

        await loadContacts({ preserveMessage: true, showLoading: false });

        if (failures.length) {
            const successCount = dirtyIds.length - failures.length;
            showMessage(
                `${successCount} contacts were saved. ${failures.length} updates failed. ${failures[0].message}`,
                'error'
            );
            return;
        }

        showMessage(`${dirtyIds.length} contacts were updated successfully.`);
    } finally {
        state.isSavingAll = false;
        renderContacts();
        updatePaginationUI();
    }
}

function resetRow(contactId) {
    if (!state.drafts.has(contactId)) {
        return;
    }

    state.drafts.delete(contactId);
    renderContacts();
    updatePaginationUI();
    showMessage('Row changes reset.');
}

function goToPage(nextPage) {
    const boundedPage = Math.min(Math.max(nextPage, 1), state.totalPages);
    if (boundedPage === state.page) {
        return;
    }

    state.page = boundedPage;
    loadContacts().catch((error) => showMessage(error.message, 'error'));
}

async function submitCreateContact(event) {
    event.preventDefault();

    if (state.isCreating) {
        return;
    }

    const payload = buildCreatePayload();
    if (!payload.LastName) {
        showCreateMessage('Last Name is required.', 'error');
        elements.createLastName.focus();
        return;
    }

    if (!payload.AccountId) {
        showCreateMessage('Select a company before creating the contact.', 'error');
        elements.accountSearchInput.focus();
        return;
    }

    state.isCreating = true;
    syncCreateFormState();

    try {
        showCreateMessage('Creating contact...');
        const response = await apiFetch('/api/contacts', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        resetCreateForm({ preserveMessage: true });
        showCreateMessage(`${response.record.name} was created successfully.`);
        await loadContacts({ preserveMessage: true, showLoading: false });
    } catch (error) {
        showCreateMessage(error.message || 'Unable to create contact', 'error');
    } finally {
        state.isCreating = false;
        syncCreateFormState();
    }
}

async function submitCreateAccount(event) {
    event.preventDefault();

    if (state.isCreatingAccount) {
        return;
    }

    const payload = buildCreateAccountPayload();
    if (!payload.Name) {
        showAccountMessage('Company Name is required.', 'error');
        elements.createAccountName.focus();
        return;
    }

    state.isCreatingAccount = true;
    syncCreateAccountFormState();

    try {
        showAccountMessage('Creating company...');
        const response = await apiFetch('/api/accounts', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        selectAccount(response.record);
        resetCreateAccountForm({ preserveMessage: true });

        const verticalMessage = response.record.vertical
            ? ` Kenway Vertical: ${response.record.vertical}.`
            : ' Kenway Vertical will populate automatically if the company qualifies.';
        showAccountMessage(`${response.record.name} was created successfully.${verticalMessage}`);
        showCreateMessage(`${response.record.name} is ready to use in Add Contact.`);
    } catch (error) {
        showAccountMessage(error.message || 'Unable to create company', 'error');
    } finally {
        state.isCreatingAccount = false;
        syncCreateAccountFormState();
    }
}

let searchTimer = null;
let accountSearchTimer = null;

elements.plansTab.addEventListener('click', () => {
    setActiveView('plans');
});

elements.addContactTab.addEventListener('click', () => {
    setActiveView('add-contact');
});

elements.addAccountTab.addEventListener('click', () => {
    setActiveView('add-account');
});

elements.refreshButton.addEventListener('click', () => {
    refreshAll();
});

elements.verticalFilter.addEventListener('change', () => {
    state.page = 1;
    loadContacts().catch((error) => showMessage(error.message, 'error'));
});

elements.networkingOwnerFilter.addEventListener('change', () => {
    state.page = 1;
    loadContacts().catch((error) => showMessage(error.message, 'error'));
});

elements.pageSizeSelect.addEventListener('change', () => {
    state.pageSize = Number(elements.pageSizeSelect.value) || 25;
    state.page = 1;
    loadContacts().catch((error) => showMessage(error.message, 'error'));
});

elements.prevPageButton.addEventListener('click', () => {
    goToPage(state.page - 1);
});

elements.nextPageButton.addEventListener('click', () => {
    goToPage(state.page + 1);
});

elements.saveAllButton.addEventListener('click', () => {
    saveAllRows().catch((error) => showMessage(error.message, 'error'));
});

elements.searchInput.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
        state.page = 1;
        loadContacts().catch((error) => showMessage(error.message, 'error'));
    }, 300);
});

elements.accountSearchInput.addEventListener('input', () => {
    const currentValue = elements.accountSearchInput.value.trim();

    if (state.selectedAccount && currentValue !== state.selectedAccount.name) {
        state.selectedAccount = null;
        renderSelectedAccount();
    }

    window.clearTimeout(accountSearchTimer);
    accountSearchTimer = window.setTimeout(() => {
        loadAccountResults(currentValue);
    }, 220);
});

elements.createClearButton.addEventListener('click', () => {
    resetCreateForm();
});

elements.createContactForm.addEventListener('submit', (event) => {
    submitCreateContact(event);
});

elements.createAccountClearButton.addEventListener('click', () => {
    resetCreateAccountForm();
});

elements.createAccountForm.addEventListener('submit', (event) => {
    submitCreateAccount(event);
});

document.addEventListener('click', (event) => {
    const activeDropdown = event.target.closest('.multi-select-dropdown');
    closeOpenMultiSelectDropdowns(activeDropdown);

    const insideAccountSearch = event.target.closest('#accountSearchInput, #accountSearchResults, #selectedAccount');
    if (!insideAccountSearch) {
        state.accountSearchResults = [];
        renderAccountSearchResults();
    }
});

elements.tableWrap?.addEventListener('scroll', () => {
    if (elements.floatingScrollbar && !state.floatingScrollbarSyncing) {
        state.floatingScrollbarSyncing = true;
        elements.floatingScrollbar.scrollLeft = elements.tableWrap.scrollLeft;
        state.floatingScrollbarSyncing = false;
    }

    syncFloatingScrollbar();
}, { passive: true });

elements.floatingScrollbar?.addEventListener('scroll', () => {
    if (state.floatingScrollbarSyncing) {
        return;
    }

    state.floatingScrollbarSyncing = true;
    elements.tableWrap.scrollLeft = elements.floatingScrollbar.scrollLeft;
    state.floatingScrollbarSyncing = false;
});

window.addEventListener('scroll', () => {
    syncFloatingScrollbar();
}, { passive: true });

window.addEventListener('resize', () => {
    syncFloatingScrollbar();
});

window.addEventListener('load', () => {
    syncFloatingScrollbar();
});

if (window.ResizeObserver) {
    const floatingScrollbarObserver = new ResizeObserver(() => {
        syncFloatingScrollbar();
    });

    if (elements.tableWrap) {
        floatingScrollbarObserver.observe(elements.tableWrap);
    }

    if (elements.contactTable) {
        floatingScrollbarObserver.observe(elements.contactTable);
    }
}

setActiveView('plans');
syncCreateFormState();
syncCreateAccountFormState();
refreshAll();
