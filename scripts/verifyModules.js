#!/usr/bin/env node

/**
 * Verify all accreditation modules can be imported without errors
 */

console.log('🔍 Verifying all accreditation modules...\n');

const modules = [
  { name: 'evidenceService', path: '../modules/evidence/services/evidenceService.js' },
  { name: 'assessmentTemplateService', path: '../modules/assessments/services/assessmentTemplateService.js' },
  { name: 'workflowService', path: '../modules/workflow/services/workflowService.js' },
  { name: 'reviewService', path: '../modules/workflow/services/reviewService.js' },
  { name: 'pdfService', path: '../modules/reports/services/pdfService.js' },
  { name: 'organizationRoutes', path: '../modules/organizations/routes/organizationRoutes.js' },
  { name: 'specialistRoutes', path: '../modules/specialists/routes/specialistRoutes.js' },
  { name: 'assessmentRoutes', path: '../modules/assessments/routes/assessmentRoutes.js' },
  { name: 'evidenceRoutes', path: '../modules/evidence/routes/evidenceRoutes.js' },
  { name: 'workflowRoutes', path: '../modules/workflow/routes/workflowRoutes.js' },
  { name: 'reportRoutes', path: '../modules/reports/routes/reportRoutes.js' }
];

let errors = 0;
let success = 0;

for (const module of modules) {
  try {
    await import(module.path);
    console.log(`✅ ${module.name}`);
    success++;
  } catch (error) {
    console.error(`❌ ${module.name}:`);
    console.error(`   ${error.message}`);
    errors++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   ✅ Success: ${success}/${modules.length}`);
console.log(`   ❌ Errors: ${errors}/${modules.length}`);

if (errors > 0) {
  console.log(`\n⚠️  There are module import errors. Server will not start correctly.`);
  process.exit(1);
} else {
  console.log(`\n✅ All modules verified successfully!`);
  process.exit(0);
}
