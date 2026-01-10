/**
 * Subscription Check Utility
 *
 * Intercetta le risposte API con codice 402 (Payment Required)
 * e mostra un messaggio appropriato all'utente con redirect a checkout
 */

/**
 * Wrapper per fetch che controlla automaticamente lo stato della subscription
 *
 * @param {string} url - URL da chiamare
 * @param {object} options - Opzioni fetch
 * @returns {Promise<Response>}
 */
export async function fetchWithSubscriptionCheck(url, options = {}) {
    try {
        const response = await fetch(url, options);

        // Controlla se è richiesta una subscription
        if (response.status === 402) {
            const data = await response.json();
            handleSubscriptionRequired(data);
            throw new Error('SUBSCRIPTION_REQUIRED');
        }

        return response;
    } catch (error) {
        if (error.message === 'SUBSCRIPTION_REQUIRED') {
            // Errore già gestito, non propagare
            return null;
        }
        throw error;
    }
}

/**
 * Gestisce il caso in cui serve una subscription
 *
 * @param {object} data - Dati dalla risposta API
 */
function handleSubscriptionRequired(data) {
    const message = data.message || 'Per accedere a questa funzionalità è necessaria una subscription attiva.';
    const code = data.code;

    let title = '🔒 Subscription Richiesta';
    let actionText = 'Vai a Checkout';

    if (code === 'SUBSCRIPTION_EXPIRED') {
        title = '⚠️ Subscription Scaduta';
        actionText = 'Rinnova Subscription';
    } else if (code === 'NO_ORGANIZATION') {
        title = '⚠️ Organizzazione Non Trovata';
        actionText = 'Registra Organizzazione';
    }

    // Mostra modal o alert
    showSubscriptionModal(title, message, data.redirect || '/checkout.html', actionText);
}

/**
 * Mostra un modal per la subscription richiesta
 *
 * @param {string} title - Titolo del modal
 * @param {string} message - Messaggio da mostrare
 * @param {string} redirectUrl - URL di redirect
 * @param {string} actionText - Testo del pulsante azione
 */
function showSubscriptionModal(title, message, redirectUrl, actionText) {
    // Rimuovi modal esistente se presente
    const existingModal = document.getElementById('subscription-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Crea modal
    const modal = document.createElement('div');
    modal.id = 'subscription-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div class="text-center">
                <div class="mb-4">
                    <svg class="w-16 h-16 mx-auto text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">${title}</h2>
                <p class="text-gray-600 mb-6">${message}</p>
                <div class="flex gap-3 justify-center">
                    <button id="subscription-modal-cancel" class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
                        Annulla
                    </button>
                    <button id="subscription-modal-action" class="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
                        ${actionText}
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('subscription-modal-cancel').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('subscription-modal-action').addEventListener('click', () => {
        window.location.href = redirectUrl;
    });

    // Chiudi con ESC
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

/**
 * Controlla lo stato della subscription all'avvio della dashboard
 * Da chiamare in DOMContentLoaded delle dashboard protette
 *
 * @returns {Promise<boolean>} - true se subscription attiva, false altrimenti
 */
export async function checkSubscriptionOnLoad() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            return false;
        }

        // Prova a fare una chiamata semplice per verificare subscription
        const response = await fetch('/api/organizations/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 402) {
            const data = await response.json();
            handleSubscriptionRequired(data);
            return false;
        }

        return response.ok;
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}

/**
 * Helper per mostrare banner di avviso subscription in scadenza
 *
 * @param {Date} expiresAt - Data di scadenza
 */
export function showExpiryWarning(expiresAt) {
    const now = new Date();
    const daysLeft = Math.ceil((new Date(expiresAt) - now) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 7 && daysLeft > 0) {
        const banner = document.createElement('div');
        banner.className = 'fixed top-0 left-0 right-0 bg-yellow-500 text-white py-2 px-4 text-center z-40';
        banner.innerHTML = `
            <span class="font-medium">⚠️ La tua subscription scade tra ${daysLeft} giorni.</span>
            <a href="/checkout.html" class="underline ml-2 font-bold">Rinnova ora</a>
            <button onclick="this.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">✕</button>
        `;
        document.body.prepend(banner);
    }
}

// Export come default anche la fetch wrapper
export default fetchWithSubscriptionCheck;
