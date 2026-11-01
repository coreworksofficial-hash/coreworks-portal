/**
 * Automated DOM & Binding Integrity Checker for ValueLens
 * Verifies that every element ID referenced in js/app.js exists in index.html
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

// Extract all id="..." from index.html
const htmlIds = new Set();
const idRegex = /\bid=["']([^"']+)["']/g;
let match;
while ((match = idRegex.exec(html)) !== null) {
  htmlIds.add(match[1]);
}

// Extract all getElementById('...') and array ID strings from app.js
const referencedIds = new Set();
const getByIdRegex = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
while ((match = getByIdRegex.exec(appJs)) !== null) {
  referencedIds.add(match[1]);
}

// Also check string arrays passed to forEach((id) => { const el = document.getElementById(id) })
const arrayIds = [
  'inputItemName', 'inputBillingCycle', 'inputYears', 'inputMonths',
  'inputFreqType', 'inputFreqCount', 'inputMinutesPerUse', 'inputResaleRate',
  'inputTimeSaved', 'inputMoneySaved', 'inputMaintenance', 'inputInvestRate',
  'abCompareYears',
  'abNameA', 'abPriceA', 'abTypeA', 'abYearsA', 'abResaleA', 'abTimeSavedA', 'abMaintA',
  'abNameB', 'abPriceB', 'abTypeB', 'abYearsB', 'abResaleB', 'abTimeSavedB', 'abMaintB',
  'wageModeSelect', 'wageMonthlyInput', 'wageAnnualInput', 'wageDirectInput',
  'wageWorkDays', 'wageWorkHours', 'wageOvertime', 'wageCommute', 'wageExpenses', 'wageStress'
];
arrayIds.forEach((id) => referencedIds.add(id));

const missingIds = [];
referencedIds.forEach((id) => {
  if (!htmlIds.has(id)) {
    missingIds.push(id);
  }
});

console.log(`Checked ${referencedIds.size} referenced DOM IDs against ${htmlIds.size} HTML IDs.`);
assert.strictEqual(missingIds.length, 0, `Missing DOM IDs in index.html: ${missingIds.join(', ')}`);
console.log('[PASS] All DOM IDs in app.js match index.html with 0 missing elements!');
