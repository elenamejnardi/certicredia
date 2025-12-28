import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function runAccreditationSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connesso al database');

    // Read accreditation schema file
    const schemaSQL = readFileSync(
      join(__dirname, '../core/database/schema/accreditation_schema.sql'),
      'utf-8'
    );

    // Execute schema
    await client.query(schemaSQL);
    console.log('✅ Accreditation schema applicato con successo!');

  } catch (error) {
    console.error('❌ Errore durante applicazione schema:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runAccreditationSchema();
