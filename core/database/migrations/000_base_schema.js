import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../connection.js';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Migration 000: Base Schema
 * Creates core tables for ecommerce and admin functionality
 */

export const up = async () => {
  const client = await pool.connect();

  try {
    logger.info('🔄 Starting migration 000_base_schema...');

    await client.query('BEGIN');

    // Read and execute the base SQL schema file
    const schemaPath = join(__dirname, '../schema/base_schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf8');

    // Execute the entire schema
    await client.query(schemaSql);

    await client.query('COMMIT');

    logger.success('✅ Migration 000_base_schema completed successfully');
    logger.info('📊 Created tables:');
    logger.info('   • users');
    logger.info('   • products');
    logger.info('   • orders');
    logger.info('   • order_items');
    logger.info('   • cart_items');
    logger.info('   • contacts');

    return { success: true };

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Migration 000_base_schema failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const down = async () => {
  const client = await pool.connect();

  try {
    logger.warn('⚠️  Running ROLLBACK migration 000_base_schema...');

    await client.query('BEGIN');

    // Drop tables in reverse order (respecting foreign keys)
    const dropStatements = [
      'DROP TABLE IF EXISTS contacts CASCADE',
      'DROP TABLE IF EXISTS cart_items CASCADE',
      'DROP TABLE IF EXISTS order_items CASCADE',
      'DROP TABLE IF EXISTS orders CASCADE',
      'DROP TABLE IF EXISTS products CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      'DROP FUNCTION IF EXISTS update_updated_at_column CASCADE'
    ];

    for (const statement of dropStatements) {
      await client.query(statement);
    }

    await client.query('COMMIT');

    logger.success('✅ Migration 000_base_schema rolled back successfully');

    return { success: true };

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || 'up';

  if (command === 'up') {
    up()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (command === 'down') {
    down()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    console.error('Usage: node 000_base_schema.js [up|down]');
    process.exit(1);
  }
}
