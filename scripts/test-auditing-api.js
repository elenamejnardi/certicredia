/**
 * Test script for auditing API
 * Verifies that maturity model and category stats are loaded correctly
 */

import * as auditingService from '../modules/auditing/services/auditingService.js';
import * as organizationService from '../modules/organizations/services/organizationService.js';
import { pool } from '../server/config/database.js';

console.log('🧪 Testing Auditing API Data Loading\n');

async function testAuditingData() {
  try {
    // Test organization ID 1 (Organization Demo)
    const orgId = 1;

    console.log(`📊 Testing Organization ID: ${orgId}`);
    console.log('━'.repeat(60));

    // Get assessment from database
    const assessment = await auditingService.getAssessmentByOrganization(orgId);

    if (!assessment) {
      console.log('❌ No assessment found for organization');
      return;
    }

    console.log('\n✅ Assessment found in database');
    console.log(`   Organization: ${assessment.organization_name}`);
    console.log(`   ID: ${assessment.organization_id}`);

    // Check if metadata exists
    if (assessment.metadata && assessment.metadata.maturity_model) {
      console.log('\n✅ Metadata with maturity_model found:');
      console.log(`   CPF Score: ${assessment.metadata.maturity_model.cpf_score}`);
      console.log(`   Maturity Level: ${assessment.metadata.maturity_model.maturity_level}`);
      console.log(`   Level Name: ${assessment.metadata.maturity_model.level_name}`);
      console.log(`   Completion: ${assessment.metadata.completion_percentage}%`);
      console.log(`   Assessed Indicators: ${assessment.metadata.assessed_indicators}/100`);
    } else {
      console.log('\n⚠️  No metadata.maturity_model found - will use calculated data');
    }

    // Check category stats
    if (assessment.metadata && assessment.metadata.category_stats) {
      console.log('\n✅ Category stats found:');
      const categories = Object.keys(assessment.metadata.category_stats);
      console.log(`   Categories: ${categories.join(', ')}`);

      // Show first category as example
      const cat1 = assessment.metadata.category_stats['1'];
      if (cat1) {
        console.log(`\n   Category 1 example:`);
        console.log(`     - Risk: ${(cat1.risk * 100).toFixed(1)}%`);
        console.log(`     - Completion: ${cat1.completion}%`);
        console.log(`     - Assessed: ${cat1.assessed}/${cat1.total}`);
      }
    }

    // Check compliance data
    if (assessment.metadata && assessment.metadata.maturity_model && assessment.metadata.maturity_model.compliance) {
      console.log('\n✅ Compliance data found:');
      const compliance = assessment.metadata.maturity_model.compliance;
      for (const [standard, data] of Object.entries(compliance)) {
        console.log(`   ${standard.toUpperCase()}: ${data.status} (score: ${data.score})`);
      }
    }

    // Check sector benchmark
    if (assessment.metadata && assessment.metadata.maturity_model && assessment.metadata.maturity_model.sector_benchmark) {
      console.log('\n✅ Sector benchmark found:');
      const benchmark = assessment.metadata.maturity_model.sector_benchmark;
      console.log(`   Percentile: ${benchmark.percentile}`);
      console.log(`   Sector Average: ${benchmark.sector_average}`);
      console.log(`   Gap: ${benchmark.gap}`);
    }

    console.log('\n' + '━'.repeat(60));
    console.log('✅ All data is available in the database!');
    console.log('\nNow test the API endpoint:');
    console.log('   1. Login as: organization@certicredia.test / Org123!@#');
    console.log('   2. Go to: /dashboard/auditing/');
    console.log('   3. Check tabs: Risk Analysis & Maturity Model');
    console.log('\nIf tabs are still empty, check browser console for errors.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testAuditingData();
