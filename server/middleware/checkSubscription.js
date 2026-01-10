/**
 * Subscription Check Middleware
 *
 * Verifica se l'organizzazione ha una subscription attiva prima di permettere
 * l'accesso alle funzionalità premium (dashboard, CPF assessments, etc.)
 */

import { pool } from '../config/database.js';

/**
 * Middleware per verificare che l'utente appartenga a un'organizzazione con subscription attiva
 *
 * Uso:
 * router.get('/api/auditing/organizations/:id', authenticate, requireActiveSubscription, getOrganization);
 */
export const requireActiveSubscription = async (req, res, next) => {
    try {
        // L'authenticate middleware dovrebbe aver già impostato req.user
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        // Trova l'organizzazione dell'utente
        const orgQuery = `
            SELECT o.id, o.name, o.subscription_active, o.subscription_expires_at, o.subscription_type
            FROM organizations o
            INNER JOIN organization_users ou ON o.id = ou.organization_id
            WHERE ou.user_id = $1
            LIMIT 1
        `;

        const orgResult = await pool.query(orgQuery, [req.user.id]);

        if (orgResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'No organization found for this user',
                code: 'NO_ORGANIZATION',
                redirect: '/public/pages/ente/register-organization.html'
            });
        }

        const organization = orgResult.rows[0];

        // Verifica subscription attiva
        if (!organization.subscription_active) {
            return res.status(402).json({
                success: false,
                error: 'Active subscription required',
                code: 'SUBSCRIPTION_REQUIRED',
                redirect: '/checkout.html',
                message: 'Per accedere a questa funzionalità è necessaria una subscription attiva.'
            });
        }

        // Verifica scadenza subscription (se presente)
        if (organization.subscription_expires_at) {
            const expiresAt = new Date(organization.subscription_expires_at);
            const now = new Date();

            if (expiresAt < now) {
                // Subscription scaduta - disattiva automaticamente
                await pool.query(
                    'UPDATE organizations SET subscription_active = FALSE WHERE id = $1',
                    [organization.id]
                );

                return res.status(402).json({
                    success: false,
                    error: 'Subscription expired',
                    code: 'SUBSCRIPTION_EXPIRED',
                    redirect: '/checkout.html',
                    message: 'La tua subscription è scaduta. Rinnova per continuare ad accedere.',
                    expiredAt: organization.subscription_expires_at
                });
            }
        }

        // Tutto ok - aggiungi info organizzazione alla request
        req.organization = organization;
        next();

    } catch (error) {
        console.error('❌ Error checking subscription:', error);
        return res.status(500).json({
            success: false,
            error: 'Error verifying subscription',
            message: error.message
        });
    }
};

/**
 * Middleware opzionale - permette accesso ma aggiunge warning se subscription manca
 * Utile per funzionalità che vogliamo mostrare ma limitare
 */
export const checkSubscriptionStatus = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return next();
        }

        const orgQuery = `
            SELECT o.id, o.name, o.subscription_active, o.subscription_expires_at, o.subscription_type
            FROM organizations o
            INNER JOIN organization_users ou ON o.id = ou.organization_id
            WHERE ou.user_id = $1
            LIMIT 1
        `;

        const orgResult = await pool.query(orgQuery, [req.user.id]);

        if (orgResult.rows.length > 0) {
            req.organization = orgResult.rows[0];
            req.hasActiveSubscription = orgResult.rows[0].subscription_active;
        } else {
            req.hasActiveSubscription = false;
        }

        next();

    } catch (error) {
        console.error('⚠️ Error checking subscription status:', error);
        // Non bloccare la richiesta, ma logga l'errore
        next();
    }
};

/**
 * Helper per attivare una subscription (da usare dopo pagamento)
 *
 * @param {number} organizationId - ID dell'organizzazione
 * @param {string} subscriptionType - Tipo di subscription (basic, premium, enterprise, lifetime)
 * @param {number} durationDays - Durata in giorni (null per lifetime)
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
export const activateSubscription = async (organizationId, subscriptionType = 'basic', durationDays = 365) => {
    try {
        const now = new Date();
        const expiresAt = durationDays ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000) : null;

        const result = await pool.query(
            `UPDATE organizations
             SET subscription_active = TRUE,
                 subscription_type = $1,
                 subscription_started_at = $2,
                 subscription_expires_at = $3
             WHERE id = $4
             RETURNING *`,
            [subscriptionType, now, expiresAt, organizationId]
        );

        if (result.rows.length === 0) {
            throw new Error('Organization not found');
        }

        console.log(`✅ Subscription activated for organization ${organizationId} (${subscriptionType}, expires: ${expiresAt || 'never'})`);

        return {
            success: true,
            data: result.rows[0]
        };

    } catch (error) {
        console.error('❌ Error activating subscription:', error);
        return {
            success: false,
            error: error.message
        };
    }
};
