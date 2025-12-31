import { pool } from '../server/config/database.js';
import logger from '../server/utils/logger.js';

/**
 * Verify and display organization_users table data
 * This helps diagnose the "Nessuna organizzazione associata" issue
 */
async function verifyOrganizationUsers() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verificando organizzazioni e utenti...\n');

    // Get all organization_admin users
    const usersResult = await client.query(
      `SELECT id, email, name, role FROM users WHERE role = 'organization_admin' OR role = 'organization_operator' ORDER BY id`
    );

    console.log(`\n👥 Utenti con ruolo organization_admin/operator (${usersResult.rows.length}):`);
    console.log('─'.repeat(80));
    usersResult.rows.forEach(user => {
      console.log(`ID: ${user.id} | Email: ${user.email} | Nome: ${user.name} | Ruolo: ${user.role}`);
    });

    // Get all organizations
    const orgsResult = await client.query(
      `SELECT id, name, organization_type, status, email FROM organizations ORDER BY id LIMIT 20`
    );

    console.log(`\n\n🏢 Organizzazioni nel database (${orgsResult.rows.length}):`);
    console.log('─'.repeat(80));
    orgsResult.rows.forEach(org => {
      console.log(`ID: ${org.id} | Nome: ${org.name} | Tipo: ${org.organization_type} | Status: ${org.status}`);
    });

    // Get all organization_users associations
    const associationsResult = await client.query(
      `SELECT
        ou.id, ou.organization_id, ou.user_id, ou.role,
        u.email as user_email, u.name as user_name,
        o.name as org_name
       FROM organization_users ou
       JOIN users u ON ou.user_id = u.id
       JOIN organizations o ON ou.organization_id = o.id
       ORDER BY ou.id`
    );

    console.log(`\n\n🔗 Associazioni organization_users (${associationsResult.rows.length}):`);
    console.log('─'.repeat(80));
    if (associationsResult.rows.length === 0) {
      console.log('⚠️  NESSUNA ASSOCIAZIONE TROVATA! Questo è il problema!');
    } else {
      associationsResult.rows.forEach(assoc => {
        console.log(`User: ${assoc.user_email} (${assoc.user_name}) -> Org: ${assoc.org_name} [Role: ${assoc.role}]`);
      });
    }

    // Check for orphaned organization_admin users (no organization association)
    const orphanedUsersResult = await client.query(
      `SELECT u.id, u.email, u.name, u.role
       FROM users u
       WHERE u.role IN ('organization_admin', 'organization_operator')
       AND NOT EXISTS (
         SELECT 1 FROM organization_users ou WHERE ou.user_id = u.id
       )`
    );

    if (orphanedUsersResult.rows.length > 0) {
      console.log(`\n\n⚠️  UTENTI ORGANIZZAZIONE SENZA ASSOCIAZIONE (${orphanedUsersResult.rows.length}):`);
      console.log('─'.repeat(80));
      orphanedUsersResult.rows.forEach(user => {
        console.log(`❌ ${user.email} (ID: ${user.id}) - ${user.name} [${user.role}]`);
      });
      console.log('\n🔧 Questi utenti NON possono accedere a /api/organizations/me');
      console.log('   Devi creare organizzazioni e associarli con organization_users\n');
    } else {
      console.log('\n✅ Tutti gli utenti organization_admin/operator hanno un\'organizzazione associata');
    }

  } catch (error) {
    logger.error('Errore verifica:', error);
    throw error;
  } finally {
    client.release();
  }
}

verifyOrganizationUsers()
  .then(() => {
    console.log('\n✅ Verifica completata');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  });
