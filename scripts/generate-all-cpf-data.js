/**
 * Auto-Generate CPF Auditing Data for ALL Organizations
 *
 * This script automatically creates CPF auditing assessments for ALL active organizations
 * in the database. Runs automatically and generates realistic data.
 *
 * Usage: node scripts/generate-all-cpf-data.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const {
  DB_HOST = 'localhost',
  DB_PORT = 5432,
  DB_NAME = 'certicredia',
  DB_USER = 'certicredia_user',
  DB_PASSWORD = 'your_secure_password_here'
} = process.env;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Generate random assessment data for 100 CPF indicators
 */
function generateAssessmentData() {
  const data = {};

  // Generate 100 indicators (10 categories x 10 indicators)
  for (let cat = 1; cat <= 10; cat++) {
    for (let ind = 1; ind <= 10; ind++) {
      const indicatorId = `${cat}-${ind}`;

      // Random value: 0 (not applicable), 1 (low), 2 (medium), 3 (high)
      // Most indicators will have values (80%), few will be 0 (20%)
      const value = Math.random() < 0.2 ? 0 : Math.floor(Math.random() * 3) + 1;

      data[indicatorId] = {
        value,
        notes: value > 0 ? `Auto-generated assessment for indicator ${indicatorId}` : '',
        last_updated: new Date().toISOString()
      };
    }
  }

  return data;
}

/**
 * Calculate metadata from assessment data
 */
function calculateMetadata(assessmentData) {
  let totalIndicators = 0;
  let answeredIndicators = 0;
  let totalScore = 0;
  let maxScore = 0;

  Object.values(assessmentData).forEach(indicator => {
    totalIndicators++;
    if (indicator.value > 0) {
      answeredIndicators++;
      totalScore += indicator.value;
      maxScore += 3; // Max value is 3
    }
  });

  const completionPercentage = totalIndicators > 0
    ? Math.round((answeredIndicators / totalIndicators) * 100)
    : 0;

  const maturityScore = maxScore > 0
    ? Math.round((totalScore / maxScore) * 100)
    : 0;

  // Determine maturity level
  let maturityLevel = 'Initial';
  if (maturityScore >= 80) maturityLevel = 'Optimized';
  else if (maturityScore >= 60) maturityLevel = 'Managed';
  else if (maturityScore >= 40) maturityLevel = 'Defined';
  else if (maturityScore >= 20) maturityLevel = 'Repeatable';

  // Calculate risk score (inverse of maturity)
  const riskScore = 100 - maturityScore;

  return {
    completion_percentage: completionPercentage,
    maturity_score: maturityScore,
    maturity_level: maturityLevel,
    risk_score: riskScore,
    total_indicators: totalIndicators,
    answered_indicators: answeredIndicators,
    last_calculated: new Date().toISOString()
  };
}

/**
 * Auto-generate assessments for ALL organizations
 */
async function generateAllAssessments() {
  log('\n🚀 Auto-Generate CPF Data for ALL Organizations', colors.cyan);
  log('=' .repeat(60), colors.cyan);

  let clientConfig;
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    clientConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: url.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : false
    };
  } else {
    clientConfig = {
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD
    };
  }
  const client = new pg.Client(clientConfig);

  try {
    await client.connect();
    log('\n✓ Connected to database', colors.green);

    // Get ALL active organizations
    const orgsResult = await client.query(`
      SELECT id, name, organization_type, status
      FROM organizations
      WHERE status = 'active'
      ORDER BY id
    `);

    if (orgsResult.rows.length === 0) {
      log('\n⚠️  No active organizations found in database', colors.yellow);
      log('Please create organizations first', colors.yellow);
      await client.end();
      return;
    }

    log(`\n📊 Found ${orgsResult.rows.length} active organization(s)`, colors.blue);
    log('', colors.reset);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const org of orgsResult.rows) {
      process.stdout.write(`📝 Processing: ${org.name.padEnd(30)} ... `);

      // Check if assessment already exists
      const existing = await client.query(
        'SELECT id, assessment_data FROM cpf_auditing_assessments WHERE organization_id = $1 AND deleted_at IS NULL',
        [org.id]
      );

      if (existing.rows.length > 0) {
        // Check if assessment has any data
        const existingData = existing.rows[0].assessment_data;
        const hasData = existingData && Object.keys(existingData).length > 0 &&
                       Object.values(existingData).some(ind => ind.value > 0);

        if (hasData) {
          log(`⏭️  SKIP (has data)`, colors.yellow);
          skipped++;
          continue;
        } else {
          // Update with generated data
          const assessmentData = generateAssessmentData();
          const metadata = calculateMetadata(assessmentData);

          await client.query(`
            UPDATE cpf_auditing_assessments
            SET assessment_data = $1, metadata = $2, last_assessment_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [JSON.stringify(assessmentData), JSON.stringify(metadata), existing.rows[0].id]);

          log(`✓ UPDATED (${metadata.completion_percentage}% complete, ${metadata.maturity_level})`, colors.green);
          updated++;
        }
      } else {
        // Create new assessment
        const assessmentData = generateAssessmentData();
        const metadata = calculateMetadata(assessmentData);

        await client.query(`
          INSERT INTO cpf_auditing_assessments
          (organization_id, assessment_data, metadata, last_assessment_date)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        `, [org.id, JSON.stringify(assessmentData), JSON.stringify(metadata)]);

        log(`✓ CREATED (${metadata.completion_percentage}% complete, ${metadata.maturity_level})`, colors.green);
        created++;
      }
    }

    log('\n' + '='.repeat(60), colors.green);
    log(`✅ Generation Complete!`, colors.green);
    log(`   Created: ${created}`, colors.green);
    log(`   Updated: ${updated}`, colors.cyan);
    log(`   Skipped: ${skipped} (already have data)`, colors.yellow);
    log('='.repeat(60), colors.green);

    // Show statistics
    const stats = await client.query(`
      SELECT
        COUNT(*) as total,
        AVG((metadata->>'completion_percentage')::numeric) as avg_completion,
        AVG((metadata->>'maturity_score')::numeric) as avg_maturity
      FROM cpf_auditing_assessments
      WHERE deleted_at IS NULL
    `);

    const { total, avg_completion, avg_maturity } = stats.rows[0];

    log('\n📊 Database Statistics:', colors.blue);
    log(`   Total Assessments: ${total}`, colors.reset);
    log(`   Avg Completion: ${Math.round(avg_completion || 0)}%`, colors.reset);
    log(`   Avg Maturity Score: ${Math.round(avg_maturity || 0)}%\n`, colors.reset);

    await client.end();
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, colors.red);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

// Run the generator
generateAllAssessments();
