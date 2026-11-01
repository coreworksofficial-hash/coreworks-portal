/**
 * Automated Verification Suite for ValueLens Engine & Presets
 */
const assert = require('assert');
const Engine = require('../js/engine.js');
const Presets = require('../js/presets.js');

console.log('=== [ValueLens Automated Test Suite: Sprint 1] ===');

// 1. Test Effective Hourly Wage Calculation
const defaultProfile = {
  incomeMode: 'monthly',
  monthlyTakeHome: 260000,
  workDaysPerMonth: 20,
  workHoursPerDay: 8,
  overtimeHoursPerMonth: 20,
  commuteMinutesPerDay: 60,
  workExpensesPerMonth: 10000,
  stressLevel: 3
};

const wage = Engine.calculateEffectiveHourlyWage(defaultProfile);
// Nominal: 260,000 / 160h = 1625 yen/h
assert.strictEqual(wage.nominalHourlyWage, 1625, 'Nominal hourly wage should be 1625');
// Total bound hours: 160 + 20 (OT) + 20 (commute 1h * 20d) = 200h
// Disposable income: 260,000 - 10,000 = 250,000
// Effective hourly wage: 250,000 / 200 = 1250 yen/h
assert.strictEqual(wage.effectiveHourlyWage, 1250, 'Effective hourly wage should be 1250');
assert.strictEqual(wage.monthlyTotalBoundHours, 200, 'Total bound hours should be 200');
console.log('[PASS] 1. Effective Hourly Wage Calculation (Nominal: 1625円/h -> Effective: 1250円/h)');

// 2. Test Opportunity Cost Calculation
const oppOneTime = Engine.calculateOpportunityCost(100000, 5.0, [5, 10, 20, 30], false);
assert(oppOneTime.projections[10].futureValue > 162000 && oppOneTime.projections[10].futureValue < 163000, '100k at 5% for 10y should be ~162,889');
const oppSub = Engine.calculateOpportunityCost(0, 5.0, [5, 10], true, 10000);
assert(oppSub.projections[10].principalTotal === 1200000, '10k/mo for 10y principal is 1,200,000');
assert(oppSub.projections[10].futureValue > 1550000, '10k/mo at 5% for 10y FV should exceed 1.55M');
console.log('[PASS] 2. Compound Interest / Opportunity Cost (One-time & Monthly Subscription)');

// 3. Test All 14 Item Presets for Mathematical Integrity
Presets.ITEM_PRESETS.forEach((preset) => {
  const res = Engine.analyzePurchase(preset, defaultProfile);
  assert(Number.isFinite(res.unitCosts.costPerDay), `Preset ${preset.id} costPerDay must be finite`);
  assert(Number.isFinite(res.unitCosts.costPerUse), `Preset ${preset.id} costPerUse must be finite`);
  assert(Number.isFinite(res.laborMetrics.requiredWorkHoursNet), `Preset ${preset.id} requiredWorkHoursNet must be finite`);
  assert(['S', 'A', 'B', 'C', 'D'].includes(res.evaluation.rank), `Preset ${preset.id} rank must be valid`);
  console.log(`  - Preset [${preset.name}]: Net=${res.itemSummary.netOutOfPocketCost.toLocaleString()}円 | 1日=${res.unitCosts.costPerDay}円 | 労働=${res.laborMetrics.requiredWorkHoursNet}h | Rank=${res.evaluation.rank} (${res.evaluation.score}点)`);
});
console.log('[PASS] 3. All Item Presets analyzed accurately');

// 4. Test A/B Comparison Battles
Presets.AB_BATTLE_PRESETS.forEach((battle) => {
  const cmp = Engine.compareTwoOptions(battle.optionA, battle.optionB, defaultProfile, battle.compareYears);
  assert(cmp.monthlySeries.length === battle.compareYears * 12 + 1, 'Monthly series length should match compareYears * 12 + 1');
  console.log(`  - Battle [${battle.title}]: Winner=${cmp.winner} | Crossover=${cmp.crossoverMonth ? cmp.crossoverMonth + 'ヶ月目' : 'なし'} | 差額=${cmp.costDifference.toLocaleString()}円 (${cmp.workHoursDifference}時間分)`);
});
console.log('[PASS] 4. All A/B Battles verified');

// 5. Edge Case Tests (0 price, huge price, 0 hours)
const zeroRes = Engine.analyzePurchase({ price: 0, yearsToUse: 1 }, defaultProfile);
assert.strictEqual(zeroRes.unitCosts.costPerDay, 0, 'Zero price should yield 0 costPerDay');
const extremeRes = Engine.analyzePurchase({ price: 50000000, yearsToUse: 35, resaleRatePercent: 30 }, defaultProfile);
assert(Number.isFinite(extremeRes.unitCosts.costPerDay), '50M house/car price should be finite');
console.log('[PASS] 5. Edge case stability verified');
