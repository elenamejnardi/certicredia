/**
 * Organizations Dashboard - JavaScript
 */

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// State
const state = {
    user: null,
    organizations: [],
    currentOrg: null,
    filters: {
        name: '',
        type: '',
        status: ''
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadOrganizations();

    // Event listeners
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('add-org-btn')?.addEventListener('click', () => openOrgModal());
    document.getElementById('cancel-modal-btn')?.addEventListener('click', closeOrgModal);
    document.getElementById('close-view-modal')?.addEventListener('click', closeViewModal);
    document.getElementById('org-form')?.addEventListener('submit', handleOrgSubmit);
    document.getElementById('reset-filters-btn')?.addEventListener('click', resetFilters);

    // Filter listeners
    document.getElementById('filter-name')?.addEventListener('input', applyFilters);
    document.getElementById('filter-type')?.addEventListener('change', applyFilters);
    document.getElementById('filter-status')?.addEventListener('change', applyFilters);
});

// Authentication
async function checkAuth() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/auth.html';
            return;
        }

        const response = await fetch(`${API_BASE}/api/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Unauthorized');

        const data = await response.json();
        state.user = data.data;

        if (state.user.role !== 'admin') {
            showToast('Accesso negato: solo gli amministratori possono accedere', 'error');
            setTimeout(() => window.location.href = '/', 2000);
            return;
        }

        document.getElementById('user-name').textContent = state.user.name;
    } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('token');
        window.location.href = '/auth.html';
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    window.location.href = '/';
}

// Organizations CRUD
async function loadOrganizations() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/organizations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load organizations');

        const data = await response.json();
        state.organizations = data.data || [];
        renderOrganizations();
    } catch (error) {
        console.error('Error loading organizations:', error);
        showToast('Errore nel caricamento delle organizzazioni', 'error');
    }
}

function renderOrganizations() {
    const tbody = document.getElementById('organizations-tbody');
    if (!tbody) return;

    // Apply filters
    let filtered = state.organizations;

    if (state.filters.name) {
        filtered = filtered.filter(org =>
            org.name.toLowerCase().includes(state.filters.name.toLowerCase())
        );
    }
    if (state.filters.type) {
        filtered = filtered.filter(org => org.type === state.filters.type);
    }
    if (state.filters.status) {
        filtered = filtered.filter(org => org.status === state.filters.status);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    Nessuna organizzazione trovata
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(org => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4">
                <div class="font-medium text-gray-900">${org.name}</div>
                <div class="text-sm text-gray-500">${org.contact_email || ''}</div>
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(org.type)}">
                    ${getTypeLabel(org.type)}
                </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">${org.vat_number || '-'}</td>
            <td class="px-6 py-4 text-sm text-gray-900">${org.city || '-'}</td>
            <td class="px-6 py-4">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(org.status)}">
                    ${getStatusLabel(org.status)}
                </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
                ${new Date(org.created_at).toLocaleDateString('it-IT')}
            </td>
            <td class="px-6 py-4 text-sm space-x-2">
                <button onclick="viewOrganization(${org.id})" class="text-cyan-600 hover:text-cyan-800">
                    Dettagli
                </button>
                <button onclick="editOrganization(${org.id})" class="text-blue-600 hover:text-blue-800">
                    Modifica
                </button>
                <button onclick="deleteOrganization(${org.id})" class="text-red-600 hover:text-red-800">
                    Elimina
                </button>
            </td>
        </tr>
    `).join('');
}

function getTypeColor(type) {
    const colors = {
        corporate: 'bg-blue-100 text-blue-800',
        government: 'bg-purple-100 text-purple-800',
        non_profit: 'bg-green-100 text-green-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
}

function getTypeLabel(type) {
    const labels = {
        corporate: 'Corporate',
        government: 'Government',
        non_profit: 'Non Profit'
    };
    return labels[type] || type;
}

function getStatusColor(status) {
    const colors = {
        active: 'bg-green-100 text-green-800',
        suspended: 'bg-red-100 text-red-800',
        pending: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function getStatusLabel(status) {
    const labels = {
        active: 'Attivo',
        suspended: 'Sospeso',
        pending: 'In Attesa'
    };
    return labels[status] || status;
}

// Filters
function applyFilters() {
    state.filters.name = document.getElementById('filter-name').value;
    state.filters.type = document.getElementById('filter-type').value;
    state.filters.status = document.getElementById('filter-status').value;
    renderOrganizations();
}

function resetFilters() {
    state.filters = { name: '', type: '', status: '' };
    document.getElementById('filter-name').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-status').value = '';
    renderOrganizations();
}

// Modal Management
function openOrgModal(org = null) {
    const modal = document.getElementById('org-modal');
    const title = document.getElementById('modal-title');

    if (org) {
        title.textContent = 'Modifica Organizzazione';
        document.getElementById('org-id').value = org.id;
        document.getElementById('org-name').value = org.name;
        document.getElementById('org-type').value = org.type;
        document.getElementById('org-vat').value = org.vat_number || '';
        document.getElementById('org-address').value = org.address || '';
        document.getElementById('org-city').value = org.city || '';
        document.getElementById('org-postal').value = org.postal_code || '';
        document.getElementById('org-country').value = org.country || 'IT';
        document.getElementById('org-email').value = org.contact_email || '';
        document.getElementById('org-phone').value = org.contact_phone || '';
        document.getElementById('org-status').value = org.status;
    } else {
        title.textContent = 'Nuova Organizzazione';
        document.getElementById('org-form').reset();
        document.getElementById('org-id').value = '';
        document.getElementById('org-country').value = 'IT';
        document.getElementById('org-status').value = 'active';
    }

    modal.classList.add('active');
}

function closeOrgModal() {
    document.getElementById('org-modal').classList.remove('active');
}

async function handleOrgSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('org-id').value;
    const orgData = {
        name: document.getElementById('org-name').value,
        type: document.getElementById('org-type').value,
        vat_number: document.getElementById('org-vat').value,
        address: document.getElementById('org-address').value,
        city: document.getElementById('org-city').value,
        postal_code: document.getElementById('org-postal').value,
        country: document.getElementById('org-country').value,
        contact_email: document.getElementById('org-email').value,
        contact_phone: document.getElementById('org-phone').value,
        status: document.getElementById('org-status').value
    };

    try {
        const token = localStorage.getItem('token');
        const url = id ? `${API_BASE}/api/organizations/${id}` : `${API_BASE}/api/organizations`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orgData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Errore durante il salvataggio');
        }

        showToast(id ? 'Organizzazione aggiornata con successo' : 'Organizzazione creata con successo', 'success');
        closeOrgModal();
        await loadOrganizations();
    } catch (error) {
        console.error('Error saving organization:', error);
        showToast(error.message || 'Errore durante il salvataggio', 'error');
    }
}

// View Organization
async function viewOrganization(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/organizations/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load organization details');

        const data = await response.json();
        const org = data.data;

        const content = document.getElementById('view-org-content');
        content.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Nome</h4>
                    <p class="mt-1 text-sm text-gray-900">${org.name}</p>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Tipo</h4>
                    <p class="mt-1"><span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(org.type)}">${getTypeLabel(org.type)}</span></p>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">P.IVA</h4>
                    <p class="mt-1 text-sm text-gray-900">${org.vat_number || '-'}</p>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Stato</h4>
                    <p class="mt-1"><span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(org.status)}">${getStatusLabel(org.status)}</span></p>
                </div>
                <div class="col-span-2">
                    <h4 class="text-sm font-medium text-gray-500">Indirizzo</h4>
                    <p class="mt-1 text-sm text-gray-900">${org.address || '-'}</p>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Città</h4>
                    <p class="mt-1 text-sm text-gray-900">${org.city || '-'}</p>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">CAP</h4>
                    <p class="mt-1 text-sm text-gray-900">${org.postal_code || '-'}</p>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Email Contatto</h4>
                    <p class="mt-1 text-sm text-gray-900">${org.contact_email || '-'}</p>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Telefono</h4>
                    <p class="mt-1 text-sm text-gray-900">${org.contact_phone || '-'}</p>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Data Creazione</h4>
                    <p class="mt-1 text-sm text-gray-900">${new Date(org.created_at).toLocaleString('it-IT')}</p>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Ultimo Aggiornamento</h4>
                    <p class="mt-1 text-sm text-gray-900">${org.updated_at ? new Date(org.updated_at).toLocaleString('it-IT') : '-'}</p>
                </div>
            </div>
            ${org.user_count !== undefined ? `
            <div class="mt-6 pt-6 border-t">
                <h4 class="text-sm font-medium text-gray-500 mb-2">Statistiche</h4>
                <div class="grid grid-cols-3 gap-4">
                    <div class="bg-blue-50 p-3 rounded">
                        <div class="text-2xl font-bold text-blue-600">${org.user_count || 0}</div>
                        <div class="text-xs text-blue-800">Utenti</div>
                    </div>
                    <div class="bg-green-50 p-3 rounded">
                        <div class="text-2xl font-bold text-green-600">${org.assessment_count || 0}</div>
                        <div class="text-xs text-green-800">Assessment</div>
                    </div>
                    <div class="bg-purple-50 p-3 rounded">
                        <div class="text-2xl font-bold text-purple-600">${org.active_assessment_count || 0}</div>
                        <div class="text-xs text-purple-800">Attivi</div>
                    </div>
                </div>
            </div>
            ` : ''}
        `;

        document.getElementById('view-org-modal').classList.add('active');
    } catch (error) {
        console.error('Error viewing organization:', error);
        showToast('Errore nel caricamento dei dettagli', 'error');
    }
}

function closeViewModal() {
    document.getElementById('view-org-modal').classList.remove('active');
}

// Edit Organization
window.editOrganization = function(id) {
    const org = state.organizations.find(o => o.id === id);
    if (org) {
        openOrgModal(org);
    }
};

// Delete Organization
window.deleteOrganization = async function(id) {
    if (!confirm('Sei sicuro di voler eliminare questa organizzazione? Questa azione non può essere annullata.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/organizations/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Errore durante l\'eliminazione');
        }

        showToast('Organizzazione eliminata con successo', 'success');
        await loadOrganizations();
    } catch (error) {
        console.error('Error deleting organization:', error);
        showToast(error.message || 'Errore durante l\'eliminazione', 'error');
    }
};

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    toastMessage.textContent = message;
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 z-50 ${
        type === 'error' ? 'bg-red-500' : 'bg-green-500'
    } text-white`;

    toast.style.transform = 'translateX(0)';

    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
    }, 3000);
}

// Expose functions for inline onclick
window.viewOrganization = viewOrganization;
