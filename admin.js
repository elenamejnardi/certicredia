/**
 * CertiCredia Admin Panel - JavaScript
 */

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// State
const state = {
    user: null,
    products: [],
    orders: [],
    users: [],
    contacts: [],
    currentSection: 'dashboard'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadDashboard();

    // Event listeners
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('product-edit-form')?.addEventListener('submit', handleProductSubmit);
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
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Unauthorized');
        }

        const data = await response.json();
        state.user = data.data;

        // Check if user is admin
        if (state.user.role !== 'admin') {
            alert('Accesso negato: solo gli amministratori possono accedere a questa pagina');
            window.location.href = '/';
            return;
        }

        document.getElementById('admin-user-name').textContent = state.user.name;

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
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Dashboard
async function loadDashboard() {
    try {
        const token = localStorage.getItem('token');

        // Load all stats in parallel
        const [productsRes, ordersRes, usersRes, contactsRes] = await Promise.all([
            fetch(`${API_BASE}/api/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
            apiCall('/api/orders/admin/all'),
            apiCall('/api/auth/users'),  // Will need to create this endpoint
            apiCall('/api/contact')
        ]);

        const products = await productsRes.json();
        const orders = ordersRes ? await ordersRes.json() : { data: [] };
        const users = usersRes ? await usersRes.json() : { data: [] };
        const contacts = contactsRes ? await contactsRes.json() : { data: [] };

        // Update stats
        document.getElementById('stats-products').textContent = products.data?.length || 0;
        document.getElementById('stats-orders').textContent = orders.data?.length || 0;
        document.getElementById('stats-users').textContent = users.data?.length || 0;
        document.getElementById('stats-contacts').textContent = contacts.data?.length || 0;

        // Show recent orders
        const recentOrders = orders.data?.slice(0, 5) || [];
        const recentOrdersHtml = recentOrders.map(order => `
            <div class="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
                <div>
                    <p class="font-medium">${order.order_number}</p>
                    <p class="text-sm text-slate-400">${order.billing_name} - €${parseFloat(order.total_amount).toFixed(2)}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs ${getStatusColor(order.status)}">${getStatusLabel(order.status)}</span>
            </div>
        `).join('');

        document.getElementById('recent-orders').innerHTML = recentOrdersHtml || '<p class="text-slate-400 text-sm">Nessun ordine</p>';

    } catch (error) {
        console.error('Dashboard load error:', error);
        notify('Errore caricamento dashboard', 'error');
    }
}

// Section Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('hidden');
    });

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'bg-slate-700');
    });

    // Show selected section
    document.getElementById(`section-${sectionName}`).classList.remove('hidden');

    // Add active class to clicked nav item
    const navItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (navItem) {
        navItem.classList.add('active', 'bg-slate-700');
    }

    state.currentSection = sectionName;

    // Load section data
    switch(sectionName) {
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
        case 'contacts':
            loadContacts();
            break;
        case 'dashboard':
            loadDashboard();
            break;
    }
}

// Products Management
async function loadProducts() {
    try {
        const response = await apiCall('/api/products/admin/all');
        if (!response) return;

        const data = await response.json();
        state.products = data.data || [];

        const tbody = document.getElementById('products-table-body');
        tbody.innerHTML = state.products.map(product => `
            <tr class="border-t border-slate-700 hover:bg-slate-750">
                <td class="p-4">
                    <div>
                        <p class="font-medium">${product.name}</p>
                        <p class="text-sm text-slate-400">${product.slug}</p>
                    </div>
                </td>
                <td class="p-4 text-slate-300">${product.category || '-'}</td>
                <td class="p-4 font-medium">€${parseFloat(product.price).toFixed(2)}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs ${product.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                        ${product.active ? 'Attivo' : 'Inattivo'}
                    </span>
                </td>
                <td class="p-4 text-right">
                    <button onclick="editProduct(${product.id})" class="text-cyan-400 hover:text-cyan-300 mr-3">Modifica</button>
                    <button onclick="toggleProductStatus(${product.id}, ${!product.active})" class="text-${product.active ? 'red' : 'green'}-400 hover:text-${product.active ? 'red' : 'green'}-300">
                        ${product.active ? 'Disattiva' : 'Attiva'}
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Load products error:', error);
        notify('Errore caricamento prodotti', 'error');
    }
}

function showProductForm() {
    document.getElementById('product-form').classList.remove('hidden');
    document.getElementById('product-form-title').textContent = 'Nuovo Prodotto';
    document.getElementById('product-edit-form').reset();
    document.getElementById('product-id').value = '';
}

function hideProductForm() {
    document.getElementById('product-form').classList.add('hidden');
}

function editProduct(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('product-form').classList.remove('hidden');
    document.getElementById('product-form-title').textContent = 'Modifica Prodotto';
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-slug').value = product.slug;
    document.getElementById('product-short-desc').value = product.short_description || '';
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-duration').value = product.duration_months || '';
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const productId = document.getElementById('product-id').value;
    const productData = {
        name: document.getElementById('product-name').value,
        slug: document.getElementById('product-slug').value,
        short_description: document.getElementById('product-short-desc').value,
        description: document.getElementById('product-description').value,
        price: parseFloat(document.getElementById('product-price').value),
        category: document.getElementById('product-category').value,
        duration_months: parseInt(document.getElementById('product-duration').value) || null
    };

    try {
        const url = productId ? `/api/products/${productId}` : '/api/products';
        const method = productId ? 'PUT' : 'POST';

        const response = await apiCall(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        if (!response) return;

        notify(`Prodotto ${productId ? 'aggiornato' : 'creato'} con successo`, 'success');
        hideProductForm();
        loadProducts();

    } catch (error) {
        console.error('Save product error:', error);
        notify('Errore salvataggio prodotto', 'error');
    }
}

async function toggleProductStatus(productId, newStatus) {
    try {
        const response = await apiCall(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: newStatus })
        });

        if (!response) return;

        notify('Stato prodotto aggiornato', 'success');
        loadProducts();

    } catch (error) {
        console.error('Toggle product status error:', error);
        notify('Errore aggiornamento stato', 'error');
    }
}

// Orders Management
async function loadOrders() {
    try {
        const response = await apiCall('/api/orders/admin/all');
        if (!response) return;

        const data = await response.json();
        state.orders = data.data || [];

        const tbody = document.getElementById('orders-table-body');
        tbody.innerHTML = state.orders.map(order => `
            <tr class="border-t border-slate-700 hover:bg-slate-750">
                <td class="p-4">
                    <p class="font-medium">${order.order_number}</p>
                </td>
                <td class="p-4">
                    <div>
                        <p class="font-medium">${order.billing_name}</p>
                        <p class="text-sm text-slate-400">${order.billing_email}</p>
                    </div>
                </td>
                <td class="p-4 font-medium">€${parseFloat(order.total_amount).toFixed(2)}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs ${getStatusColor(order.status)}">
                        ${getStatusLabel(order.status)}
                    </span>
                </td>
                <td class="p-4 text-slate-300">${new Date(order.created_at).toLocaleDateString('it-IT')}</td>
                <td class="p-4 text-right">
                    <button onclick="viewOrder(${order.id})" class="text-cyan-400 hover:text-cyan-300">Dettagli</button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Load orders error:', error);
        notify('Errore caricamento ordini', 'error');
    }
}

async function viewOrder(orderId) {
    try {
        const response = await apiCall(`/api/orders/${orderId}`);
        if (!response) return;

        const data = await response.json();
        const order = data.data;

        const content = `
            <div class="space-y-6">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-slate-400">Numero Ordine</p>
                        <p class="font-medium">${order.order_number}</p>
                    </div>
                    <div>
                        <p class="text-sm text-slate-400">Data</p>
                        <p class="font-medium">${new Date(order.created_at).toLocaleString('it-IT')}</p>
                    </div>
                    <div>
                        <p class="text-sm text-slate-400">Cliente</p>
                        <p class="font-medium">${order.billing_name}</p>
                        <p class="text-sm text-slate-400">${order.billing_email}</p>
                        <p class="text-sm text-slate-400">${order.billing_phone}</p>
                    </div>
                    <div>
                        <p class="text-sm text-slate-400">Indirizzo Fatturazione</p>
                        <p class="text-sm">${order.billing_address}</p>
                        <p class="text-sm">${order.billing_postal_code} ${order.billing_city}</p>
                        <p class="text-sm">${order.billing_country}</p>
                    </div>
                </div>

                <div>
                    <h3 class="font-bold mb-3">Prodotti</h3>
                    <div class="bg-slate-900 rounded-lg divide-y divide-slate-800">
                        ${order.items.map(item => `
                            <div class="p-4 flex justify-between">
                                <div>
                                    <p class="font-medium">${item.product_name}</p>
                                    <p class="text-sm text-slate-400">Quantità: ${item.quantity}</p>
                                </div>
                                <p class="font-medium">€${parseFloat(item.total_price).toFixed(2)}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="flex justify-between items-center pt-4 border-t border-slate-700">
                    <p class="text-lg font-bold">Totale</p>
                    <p class="text-2xl font-bold text-cyan-400">€${parseFloat(order.total_amount).toFixed(2)}</p>
                </div>

                <div>
                    <label class="block text-sm text-slate-400 mb-2">Stato Ordine</label>
                    <select id="order-status-select" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>In Attesa</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confermato</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>In Lavorazione</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completato</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Annullato</option>
                    </select>
                </div>

                <button onclick="updateOrderStatus(${order.id})" class="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold py-3 rounded-lg">
                    Aggiorna Stato
                </button>
            </div>
        `;

        document.getElementById('order-detail-content').innerHTML = content;
        document.getElementById('order-modal').classList.remove('hidden');

    } catch (error) {
        console.error('View order error:', error);
        notify('Errore caricamento dettagli ordine', 'error');
    }
}

async function updateOrderStatus(orderId) {
    const newStatus = document.getElementById('order-status-select').value;

    try {
        const response = await apiCall(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response) return;

        notify('Stato ordine aggiornato', 'success');
        closeOrderModal();
        loadOrders();

    } catch (error) {
        console.error('Update order status error:', error);
        notify('Errore aggiornamento stato ordine', 'error');
    }
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
}

// Users Management
async function loadUsers() {
    try {
        // Since we don't have a users endpoint yet, we'll fetch from a workaround
        const response = await apiCall('/api/auth/users');
        if (!response) {
            // Fallback: show empty state
            document.getElementById('users-table-body').innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Endpoint utenti non ancora implementato</td></tr>';
            return;
        }

        const data = await response.json();
        state.users = data.data || [];

        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = state.users.map(user => `
            <tr class="border-t border-slate-700 hover:bg-slate-750">
                <td class="p-4">
                    <p class="font-medium">${user.name}</p>
                    ${user.company ? `<p class="text-sm text-slate-400">${user.company}</p>` : ''}
                </td>
                <td class="p-4 text-slate-300">${user.email}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}">
                        ${user.role === 'admin' ? 'Admin' : 'Utente'}
                    </span>
                </td>
                <td class="p-4 text-slate-300">${new Date(user.created_at).toLocaleDateString('it-IT')}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs ${user.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                        ${user.active ? 'Attivo' : 'Inattivo'}
                    </span>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Load users error:', error);
        document.getElementById('users-table-body').innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nessun utente</td></tr>';
    }
}

// Contacts Management
async function loadContacts() {
    try {
        const response = await apiCall('/api/contact');
        if (!response) return;

        const data = await response.json();
        state.contacts = data.data || [];

        const tbody = document.getElementById('contacts-table-body');
        tbody.innerHTML = state.contacts.map(contact => `
            <tr class="border-t border-slate-700 hover:bg-slate-750">
                <td class="p-4">
                    <p class="font-medium">${contact.name}</p>
                    ${contact.company ? `<p class="text-sm text-slate-400">${contact.company}</p>` : ''}
                    ${contact.linkedin ? `<p class="text-sm text-slate-400">${contact.linkedin}</p>` : ''}
                </td>
                <td class="p-4 text-slate-300">${contact.email}</td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded text-xs ${contact.user_type === 'COMPANY' ? 'bg-blue-500/20 text-blue-400' : 'bg-cyan-500/20 text-cyan-400'}">
                        ${contact.user_type === 'COMPANY' ? 'Azienda' : 'Specialist'}
                    </span>
                </td>
                <td class="p-4 text-sm text-slate-300 max-w-xs truncate">${contact.message || '-'}</td>
                <td class="p-4 text-slate-300">${new Date(contact.created_at).toLocaleDateString('it-IT')}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs ${getContactStatusColor(contact.status)}">
                        ${getContactStatusLabel(contact.status)}
                    </span>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Load contacts error:', error);
        notify('Errore caricamento contatti', 'error');
    }
}

// Utility Functions
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/auth.html';
        return null;
    }

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, { ...defaultOptions, ...options });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/auth.html';
                return null;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        return response;
    } catch (error) {
        console.error('API call error:', error);
        notify('Errore di connessione', 'error');
        return null;
    }
}

function getStatusColor(status) {
    const colors = {
        'pending': 'bg-yellow-500/20 text-yellow-400',
        'confirmed': 'bg-blue-500/20 text-blue-400',
        'processing': 'bg-purple-500/20 text-purple-400',
        'completed': 'bg-green-500/20 text-green-400',
        'cancelled': 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'In Attesa',
        'confirmed': 'Confermato',
        'processing': 'In Lavorazione',
        'completed': 'Completato',
        'cancelled': 'Annullato'
    };
    return labels[status] || status;
}

function getContactStatusColor(status) {
    const colors = {
        'new': 'bg-cyan-500/20 text-cyan-400',
        'contacted': 'bg-blue-500/20 text-blue-400',
        'closed': 'bg-slate-500/20 text-slate-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
}

function getContactStatusLabel(status) {
    const labels = {
        'new': 'Nuovo',
        'contacted': 'Contattato',
        'closed': 'Chiuso'
    };
    return labels[status] || status;
}

function notify(message, type = 'info') {
    // Simple notification - could be enhanced with a toast library
    const colors = {
        'success': 'bg-green-500',
        'error': 'bg-red-500',
        'info': 'bg-cyan-500'
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}
