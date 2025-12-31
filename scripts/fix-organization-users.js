import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

/**
 * Fix missing organization_users associations
 *
 * This script creates organizations and associations for organization_admin users
 * that don't have them, fixing the "Nessuna organizzazione associata" error.
 */
async function fixOrganizationUsers() {
  const client = new Client(
    process.env.DATABASE_URL || {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'certicredia',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    }
  );

  try {
    await client.connect();
    console.log('📦 Connected to database\n');

    // Find organization_admin users without organizations
    const orphanedUsersResult = await client.query(
      `SELECT u.id, u.email, u.name, u.role, u.company
       FROM users u
       WHERE u.role IN ('organization_admin', 'organization_operator')
       AND NOT EXISTS (
         SELECT 1 FROM organization_users ou WHERE ou.user_id = u.id
       )`
    );

    const orphanedUsers = orphanedUsersResult.rows;

    if (orphanedUsers.length === 0) {
      console.log('✅ Tutti gli utenti organization_admin/operator hanno già un\'organizzazione associata');
      return;
    }

    console.log(`🔧 Trovati ${orphanedUsers.length} utenti senza organizzazione:`);
    orphanedUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.name}) - ${user.company || 'No company'}`);
    });
    console.log('');

    // Create organizations and associations for each orphaned user
    for (const user of orphanedUsers) {
      await client.query('BEGIN');

      try {
        // Determine organization name from user data
        const orgName = user.company || `${user.name}'s Organization`;
        const orgEmail = user.email;

        // Check if organization with this email already exists
        const existingOrg = await client.query(
          'SELECT id, name FROM organizations WHERE email = $1',
          [orgEmail]
        );

        let orgId;

        if (existingOrg.rows.length > 0) {
          // Organization exists, just create the association
          orgId = existingOrg.rows[0].id;
          console.log(`   ℹ️  Organizzazione già esistente: ${existingOrg.rows[0].name} (ID: ${orgId})`);
        } else {
          // Create new organization
          const orgResult = await client.query(
            `INSERT INTO organizations (
              name, organization_type, email, phone,
              address, city, postal_code, country,
              status, verified
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id`,
            [
              orgName,
              'PRIVATE_COMPANY',  // Default type
              orgEmail,
              '+39 06 12345678',  // Placeholder
              'Via Roma 123',     // Placeholder
              'Roma',
              '00100',
              'Italia',
              'active',
              true
            ]
          );

          orgId = orgResult.rows[0].id;
          console.log(`   ✅ Organizzazione creata: ${orgName} (ID: ${orgId})`);
        }

        // Create organization_users association
        await client.query(
          `INSERT INTO organization_users (organization_id, user_id, role)
           VALUES ($1, $2, 'admin')
           ON CONFLICT (organization_id, user_id) DO NOTHING`,
          [orgId, user.id]
        );

        await client.query('COMMIT');
        console.log(`   ✅ Utente ${user.email} associato all'organizzazione (ID: ${orgId})\n`);

      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Errore per ${user.email}:`, error.message);
      }
    }

    console.log('\n🎉 Fix completato! Gli utenti possono ora accedere a /api/organizations/me\n');

    // Show summary
    const associationsResult = await client.query(
      `SELECT
        u.email as user_email, u.name as user_name, u.role,
        o.name as org_name, o.id as org_id
       FROM organization_users ou
       JOIN users u ON ou.user_id = u.id
       JOIN organizations o ON ou.organization_id = o.id
       WHERE u.role IN ('organization_admin', 'organization_operator')
       ORDER BY u.email`
    );

    console.log('📋 Riepilogo associazioni attuali:');
    console.log('─'.repeat(80));
    associationsResult.rows.forEach(assoc => {
      console.log(`${assoc.user_email} → ${assoc.org_name} (Org ID: ${assoc.org_id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

fixOrganizationUsers().catch(console.error);
