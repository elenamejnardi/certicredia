import { loadAllData, loadOrganizationDetails } from './api.js';
import { setupDashboardEventDelegation } from './events.js';
import { setupClientEventDelegation } from '../client/index.js'; // Importante! Attiva eventi client

// Global callback for client to refresh dashboard
window.dashboardReloadOrganization = async function() {
    // Re-imports needed because this is global scope
    // We assume selectedOrgId is managed in state
    const { selectedOrgId } = await import('./state.js'); 
    if (selectedOrgId) {
        await loadOrganizationDetails(selectedOrgId);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Setup Events
    setupDashboardEventDelegation();
    setupClientEventDelegation(); // Client logic listeners

    // 2. Parse URL hash to get organization ID
    // Format: #organization/123 or #organization/123&indicator=1.1&mode=edit
    const hash = window.location.hash;
    console.log('🔗 URL hash:', hash);

    const orgMatch = hash.match(/#organization\/(\d+)/);
    if (orgMatch) {
        const orgId = parseInt(orgMatch[1]);
        console.log('✅ Organization ID from URL:', orgId);

        // Load only this specific organization
        await loadOrganizationDetails(orgId);

        // Parse additional parameters (indicator, mode)
        const indicatorMatch = hash.match(/indicator=([\d.]+)/);
        const modeMatch = hash.match(/mode=(\w+)/);

        if (indicatorMatch) {
            console.log('📍 Indicator from URL:', indicatorMatch[1]);
            // TODO: Auto-open indicator if needed
        }
        if (modeMatch) {
            console.log('✏️ Mode from URL:', modeMatch[1]);
            // TODO: Switch to edit mode if needed
        }
    } else {
        console.warn('⚠️ No organization ID in URL hash, dashboard may not work correctly');
        // Don't load all organizations - this is not how the dashboard should be used
        // await loadAllData();
    }
});