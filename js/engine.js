/**
 * ValueLens (バリューレンズ) - Core Mathematical & Behavioral Economics Engine
 * 100% Client-Side / Zero External Dependencies / Dual Browser & Node.js Compatible
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ValueLensEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * 身近なモノサシ（日割り・1回あたりコストの直感比較ベンチマーク）
   */
  const EVERYDAY_BENCHMARKS = [
    { id: 'umaibo', name: 'うまい棒', price: 15, unit: '本', icon: '🌽' },
    { id: 'gum', name: '粒ガム', price: 30, unit: '個', icon: '🍬' },
    { id: 'water_500', name: 'スーパーの天然水(500ml)', price: 78, unit: '本', icon: '💧' },
    { id: 'conveni_coffee', name: 'コンビニ挽きたてコーヒー', price: 120, unit: '杯', icon: '☕' },
    { id: 'vending_drink', name: '自販機のペットボトル', price: 170, unit: '本', icon: '🥤' },
    { id: 'onigiri', name: 'コンビニのおにぎり', price: 190, unit: '個', icon: '🍙' },
    { id: 'cafe_latte', name: 'カフェのラテ', price: 480, unit: '杯', icon: '🧋' },
    { id: 'ramen_lunch', name: 'こだわりラーメンランチ', price: 1050, unit: '杯', icon: '🍜' },
    { id: 'movie_ticket', name: '映画館の鑑賞チケット', price: 2000, unit: '回', icon: '🎬' },
    { id: 'izakaya', name: '飲み会1回分', price: 4500, unit: '回', icon: '🍺' }
  ];

  /**
   * 数値を安全に有限数へ変換するヘルパー
   */
  function toSafeNumber(val, fallback = 0, min = -Infinity, max = Infinity) {
    const num = Number(val);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(max, Math.max(min, num));
  }

  /**
   * 1. 「真の実効時給」計算エンジン
   * 表面上の時給だけでなく、通勤時間・身支度時間・残業・仕事のストレス係数を加味した実効時給を算出する
   *
   * @param {Object} profile
   * @param {string} profile.incomeMode - 'monthly' (手取り月収) | 'annual' (手取り年収) | 'hourly' (時給直接指定)
   * @param {number} profile.monthlyTakeHome - 手取り月収 (円) デフォルト: 260000
   * @param {number} profile.annualTakeHome - 手取り年収 (円) デフォルト: 3500000
   * @param {number} profile.directHourlyWage - 直接入力時給 (円) デフォルト: 1600
   * @param {number} profile.workDaysPerMonth - 月間出勤日数 (日) デフォルト: 20
   * @param {number} profile.workHoursPerDay - 1日の所定労働時間 (時間) デフォルト: 8
   * @param {number} profile.overtimeHoursPerMonth - 月間残業時間 (時間) デフォルト: 15
   * @param {number} profile.commuteMinutesPerDay - 往復の通勤＋仕事準備時間 (分/日) デフォルト: 75
   * @param {number} profile.workWorkExpensesPerMonth - 仕事のために自腹で出している月間費用（ランチ代上乗せ・スーツ・飲み会等） デフォルト: 10000
   * @param {number} profile.stressLevel - 仕事のしんどさ・ストレス度 (1: 楽しい 〜 5: 限界) デフォルト: 3
   */
  function calculateEffectiveHourlyWage(profile = {}) {
    const mode = profile.incomeMode || 'monthly';
    const monthlyTakeHome = toSafeNumber(profile.monthlyTakeHome, 260000, 0, 100000000);
    const annualTakeHome = toSafeNumber(profile.annualTakeHome, 3500000, 0, 1000000000);
    const directHourlyWage = toSafeNumber(profile.directHourlyWage, 1600, 100, 1000000);

    const workDaysPerMonth = toSafeNumber(profile.workDaysPerMonth, 20, 1, 31);
    const workHoursPerDay = toSafeNumber(profile.workHoursPerDay, 8, 0.5, 24);
    const overtimeHoursPerMonth = toSafeNumber(profile.overtimeHoursPerMonth, 15, 0, 300);
    const commuteMinutesPerDay = toSafeNumber(profile.commuteMinutesPerDay, 75, 0, 600);
    const workExpensesPerMonth = toSafeNumber(profile.workExpensesPerMonth, 10000, 0, 1000000);
    const stressLevel = toSafeNumber(profile.stressLevel, 3, 1, 5);

    // 所定労働時間
    const scheduledMonthlyHours = workDaysPerMonth * workHoursPerDay;
    // 通勤・身支度による月間拘束時間
    const commuteHoursPerMonth = (commuteMinutesPerDay / 60) * workDaysPerMonth;
    // 総拘束時間（所定＋残業＋通勤準備）
    const totalBoundHoursPerMonth = Math.max(1, scheduledMonthlyHours + overtimeHoursPerMonth + commuteHoursPerMonth);

    const baseMonthlyIncome = mode === 'hourly'
      ? directHourlyWage * scheduledMonthlyHours
      : (mode === 'annual' ? annualTakeHome / 12 : monthlyTakeHome);
    const netDisposableMonthlyIncome = Math.max(0, baseMonthlyIncome - workExpensesPerMonth);

    // 表面上の時給（手取り÷所定労働時間、時給モード時は指定時給）
    const nominalHourlyWage = mode === 'hourly'
      ? Math.max(100, Math.round(directHourlyWage))
      : Math.max(100, Math.round(baseMonthlyIncome / Math.max(1, scheduledMonthlyHours)));
    // 真の実効時給（実質可処分手取り÷総拘束時間）
    const effectiveHourlyWage = Math.max(100, Math.round(netDisposableMonthlyIncome / totalBoundHoursPerMonth));

    // ストレス補正時給（ストレスが高い仕事ほど「1時間働く苦痛コスト」が大きいため、同じ金額を稼ぐ体感ハードルが上がる）
    const stressMultipliers = { 1: 1.12, 2: 1.05, 3: 1.0, 4: 0.86, 5: 0.72 };
    const stressMultiplier = stressMultipliers[Math.round(stressLevel)] || 1.0;
    const psychologicalHourlyWage = Math.max(100, Math.round(effectiveHourlyWage * stressMultiplier));

    const hiddenCostRatio = nominalHourlyWage > 0
      ? Math.max(0, Number(((1 - effectiveHourlyWage / nominalHourlyWage) * 100).toFixed(1)))
      : 0;

    return {
      nominalHourlyWage,
      effectiveHourlyWage,
      psychologicalHourlyWage,
      monthlyNetIncome: Math.round(baseMonthlyIncome),
      monthlyDisposableIncome: Math.round(netDisposableMonthlyIncome),
      scheduledMonthlyHours: Number(scheduledMonthlyHours.toFixed(1)),
      commuteHoursPerMonth: Number(commuteHoursPerMonth.toFixed(1)),
      overtimeHoursPerMonth: Number(overtimeHoursPerMonth.toFixed(1)),
      monthlyTotalBoundHours: Number(totalBoundHoursPerMonth.toFixed(1)),
      hiddenCostRatio
    };
  }

  /**
   * 2. 複利運用（投資機会費用）計算関数
   * 今このお金を使わずに年利 r% で運用した場合の未来価値を算出
   */
  function calculateOpportunityCost(principal, annualRatePercent = 5.0, yearsList = [5, 10, 20, 30], isMonthlyRecurring = false, monthlyAmount = 0, subscriptionMonths = 12) {
    const rate = toSafeNumber(annualRatePercent, 5.0, 0, 30) / 100;
    const safePrincipal = toSafeNumber(principal, 0, 0, 1000000000);
    const projections = {};

    yearsList.forEach((years) => {
      if (!isMonthlyRecurring) {
        // 一括投資の複利計算: FV = PV * (1 + r)^n
        const fv = Math.round(safePrincipal * Math.pow(1 + rate, years));
        projections[years] = {
          years,
          principalTotal: Math.round(safePrincipal),
          futureValue: fv,
          gain: Math.round(fv - safePrincipal)
        };
      } else {
        // 毎月のサブスク費をそのまま積立投資に回した場合（月次複利）
        const monthlyRate = rate / 12;
        const totalMonths = years * 12;
        const mAmount = toSafeNumber(monthlyAmount, 0, 0, 10000000);
        let fv = 0;
        if (monthlyRate === 0) {
          fv = mAmount * totalMonths;
        } else {
          fv = mAmount * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
        }
        const totalPaid = mAmount * totalMonths;
        projections[years] = {
          years,
          principalTotal: Math.round(totalPaid),
          futureValue: Math.round(fv),
          gain: Math.round(fv - totalPaid)
        };
      }
    });

    // 年次推移配列（1年目〜20年目）チャート描画用
    const timeline = [];
    for (let y = 0; y <= 20; y++) {
      if (!isMonthlyRecurring) {
        const fv = Math.round(safePrincipal * Math.pow(1 + rate, y));
        timeline.push({
          year: y,
          principal: Math.round(safePrincipal),
          futureValue: fv,
          gain: Math.round(fv - safePrincipal)
        });
      } else {
        const monthlyRate = rate / 12;
        const m = y * 12;
        const mAmount = toSafeNumber(monthlyAmount, 0, 0, 10000000);
        const fv = m === 0 ? 0 : (monthlyRate === 0 ? mAmount * m : mAmount * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate));
        const totalPaid = mAmount * m;
        timeline.push({
          year: y,
          principal: Math.round(totalPaid),
          futureValue: Math.round(fv),
          gain: Math.round(fv - totalPaid)
        });
      }
    }

    return {
      annualRatePercent: toSafeNumber(annualRatePercent, 5.0, 0, 30),
      projections,
      timeline
    };
  }

  /**
   * 3. 身近なモノサシ変換（1日あたり or 1回あたりのコストを日常アイテムに例える）
   */
  function matchEverydayBenchmark(costPerUnit) {
    const cost = toSafeNumber(costPerUnit, 0, 0);
    if (cost <= 0) {
      return {
        primaryText: '実質 0円（タダ同然！）',
        icon: '✨',
        comparisons: []
      };
    }

    const comparisons = EVERYDAY_BENCHMARKS.map((item) => {
      const count = cost / item.price;
      return {
        ...item,
        count: Number(count.toFixed(count < 1 ? 2 : 1)),
        diffRatio: Math.abs(Math.log(Math.max(0.01, count)))
      };
    });

    // 1個〜3個程度に収まる最も直感的なアイテムを選択
    const sorted = [...comparisons].sort((a, b) => {
      const aIdeal = a.count >= 0.5 && a.count <= 4 ? 0 : 1;
      const bIdeal = b.count >= 0.5 && b.count <= 4 ? 0 : 1;
      if (aIdeal !== bIdeal) return aIdeal - bIdeal;
      return a.diffRatio - b.diffRatio;
    });

    const best = sorted[0];
    let countStr = best.count >= 10 ? Math.round(best.count) : best.count;
    const primaryText = `${best.icon} ${best.name} 約${countStr}${best.unit}分`;

    return {
      primaryText,
      icon: best.icon,
      bestMatch: best,
      comparisons: comparisons.slice(0, 5)
    };
  }

  /**
   * 4. メイン買い物価値診断エンジン
   *
   * @param {Object} item - 診断対象アイテムの入力パラメータ
   * @param {string} item.name - アイテム名
   * @param {string} item.purchaseType - 'one_time' (買い切り) | 'subscription' (サブスク・定期固定費)
   * @param {number} item.price - 購入価格（円）またはサブスク月額（円）
   * @param {string} item.billingCycle - サブスクの場合 'monthly' | 'annual'
   * @param {number} item.yearsToUse - 想定使用年数（年） 例: 3
   * @param {number} item.monthsToUse - 想定使用月数（年数と合算または単独指定）
   * @param {string} item.frequencyType - 'daily' (毎日) | 'weekly' (週N回) | 'monthly' (月N回) | 'yearly' (年N回)
   * @param {number} item.frequencyCount - 週/月/年あたりの使用回数（dailyの場合は1日あたり回数）
   * @param {number} item.minutesPerUse - 1回あたりの使用時間（分）
   * @param {number} item.resaleRatePercent - 使い終わった後の売却・下取り予想率（0〜90%）または直接金額
   * @param {number} item.resaleValueDirect - 直接指定のリセール価格（円、未指定時はresaleRatePercentから算出）
   * @param {number} item.annualMaintenanceCost - 年間の維持費・ランニングコスト（円/年、電気代やフィルター代など）
   * @param {number} item.timeSavedMinutesPerUse - 1回使うごとに節約できる時間（分：食洗機や時短家電など）
   * @param {number} item.moneySavedPerUse - 1回使うごとに節約できる金額（円：水筒や自炊家電など）
   * @param {number} item.satisfactionScore - ワクワク度・健康/QOL向上スコア (1〜5)
   * @param {number} item.investmentRatePercent - 機会費用計算用の想定投資利回り（%/年）
   * @param {Object} userProfile - ユーザーの時給プロファイル
   */
  function analyzePurchase(item = {}, userProfile = {}) {
    const wageData = calculateEffectiveHourlyWage(userProfile);
    const effectiveHourlyWage = wageData.effectiveHourlyWage;

    const purchaseType = item.purchaseType === 'subscription' ? 'subscription' : 'one_time';
    const rawPrice = toSafeNumber(item.price, 30000, 0, 1000000000);
    const billingCycle = item.billingCycle || 'monthly';

    // 使用期間（日数・月数・年数）の算出
    const yearsInput = toSafeNumber(item.yearsToUse, 2, 0, 50);
    const monthsInput = toSafeNumber(item.monthsToUse, 0, 0, 600);
    const totalMonths = Math.max(0.25, yearsInput * 12 + monthsInput);
    const totalYears = totalMonths / 12;
    const totalDays = Math.max(1, Math.round(totalYears * 365.25));

    // 総支払額とリセールバリューの算出
    let initialOutlay = rawPrice;
    let totalSubscriptionPaid = 0;
    let monthlySubscriptionEquivalent = 0;

    if (purchaseType === 'subscription') {
      if (billingCycle === 'annual') {
        monthlySubscriptionEquivalent = rawPrice / 12;
        totalSubscriptionPaid = monthlySubscriptionEquivalent * totalMonths;
      } else {
        monthlySubscriptionEquivalent = rawPrice;
        totalSubscriptionPaid = rawPrice * totalMonths;
      }
      initialOutlay = totalSubscriptionPaid;
    }

    // リセールバリュー（サブスクは原則0円）
    const resaleRatePercent = purchaseType === 'subscription'
      ? 0
      : toSafeNumber(item.resaleRatePercent, 0, 0, 95);
    const resaleValue = purchaseType === 'subscription'
      ? 0
      : (item.resaleValueDirect !== undefined && item.resaleValueDirect !== null && item.resaleValueDirect !== ''
          ? toSafeNumber(item.resaleValueDirect, 0, 0, initialOutlay)
          : Math.round(initialOutlay * (resaleRatePercent / 100)));

    // 維持費総額
    const annualMaintenanceCost = toSafeNumber(item.annualMaintenanceCost, 0, 0, 10000000);
    const totalMaintenanceCost = Math.round(annualMaintenanceCost * totalYears);

    // 使用回数の算出
    const freqType = item.frequencyType || 'daily';
    const freqCount = toSafeNumber(item.frequencyCount, 1, 0.1, 1000);
    let usesPerYear = 365.25;
    if (freqType === 'daily') {
      usesPerYear = 365.25 * freqCount;
    } else if (freqType === 'weekly') {
      usesPerYear = (365.25 / 7) * freqCount;
    } else if (freqType === 'monthly') {
      usesPerYear = 12 * freqCount;
    } else if (freqType === 'yearly') {
      usesPerYear = freqCount;
    }
    const totalUses = Math.max(1, Math.round(usesPerYear * totalYears));

    // 1回あたり使用時間・総使用時間
    const minutesPerUse = toSafeNumber(item.minutesPerUse, 60, 1, 1440);
    const totalHoursUsed = Math.max(0.1, Number(((totalUses * minutesPerUse) / 60).toFixed(1)));

    // 時短効果・金銭節約効果の算出
    const timeSavedMinutesPerUse = toSafeNumber(item.timeSavedMinutesPerUse, 0, 0, 1440);
    const totalTimeSavedHours = Number(((totalUses * timeSavedMinutesPerUse) / 60).toFixed(1));
    const timeSavedMonetaryValue = Math.round(totalTimeSavedHours * effectiveHourlyWage);

    const moneySavedPerUse = toSafeNumber(item.moneySavedPerUse, 0, 0, 1000000);
    const totalMoneySaved = Math.round(totalUses * moneySavedPerUse);

    // 実質純負担額（Gross Cost - Resale + Maintenance）
    const grossCost = Math.round(initialOutlay + totalMaintenanceCost);
    const netOutOfPocketCost = Math.round(initialOutlay - resaleValue + totalMaintenanceCost);

    // 金銭節約＆時短価値まで差し引いた「真の経済的実質コスト（マイナスなら黒字＝元が取れる！）」
    const economicNetCost = Math.round(netOutOfPocketCost - totalMoneySaved - timeSavedMonetaryValue);

    // 単位あたりコスト（リセール・維持費反映後の実質負担ベース）
    const costPerDay = Number((netOutOfPocketCost / totalDays).toFixed(1));
    const costPerMonth = Math.round(netOutOfPocketCost / totalMonths);
    const costPerUse = Number((netOutOfPocketCost / totalUses).toFixed(1));
    const costPerHourUsed = Number((netOutOfPocketCost / totalHoursUsed).toFixed(1));

    // 労働時間への換算
    const requiredWorkHoursInitial = Number((initialOutlay / effectiveHourlyWage).toFixed(1));
    const requiredWorkHoursNet = Number((Math.max(0, netOutOfPocketCost) / effectiveHourlyWage).toFixed(1));
    const workHoursPerDay = toSafeNumber(userProfile.workHoursPerDay, 8, 1, 24);
    const requiredWorkDaysNet = Number((requiredWorkHoursNet / workHoursPerDay).toFixed(1));

    // 投資機会費用（もし買わずに年利 r% で運用していたら）
    const investRate = toSafeNumber(item.investmentRatePercent, 5.0, 0, 30);
    const opportunityCost = calculateOpportunityCost(
      initialOutlay,
      investRate,
      [5, 10, 20, 30],
      purchaseType === 'subscription',
      monthlySubscriptionEquivalent
    );

    // 身近なモノサシ変換（1日あたり & 1回あたり）
    const dailyBenchmark = matchEverydayBenchmark(costPerDay);
    const perUseBenchmark = matchEverydayBenchmark(costPerUse);

    // 総合バリュー・ROIスコア判定（0〜100点 & ランク S/A/B/C/D）
    const satisfactionScore = toSafeNumber(item.satisfactionScore, 3, 1, 5);
    const biasReport = analyzeCognitiveBiases(item, initialOutlay, effectiveHourlyWage);

    const evaluation = evaluatePurchaseVerdict({
      netOutOfPocketCost: netOutOfPocketCost + biasReport.interestFeeTotal,
      economicNetCost: economicNetCost + biasReport.interestFeeTotal,
      costPerUse,
      costPerHourUsed,
      costPerDay,
      effectiveHourlyWage,
      totalUses,
      totalDays,
      totalTimeSavedHours,
      totalMoneySaved,
      resaleValue,
      initialOutlay,
      satisfactionScore,
      requiredWorkDaysNet,
      biasReport
    });

    return {
      itemSummary: {
        name: item.name || '検討中のアイテム',
        purchaseType,
        initialOutlay: Math.round(initialOutlay),
        grossCost: Math.round(grossCost + biasReport.interestFeeTotal),
        resaleValue,
        totalMaintenanceCost,
        interestFeeTotal: biasReport.interestFeeTotal,
        netOutOfPocketCost: Math.round(netOutOfPocketCost + biasReport.interestFeeTotal),
        economicNetCost: Math.round(economicNetCost + biasReport.interestFeeTotal),
        totalDays,
        totalMonths: Number(totalMonths.toFixed(1)),
        totalYears: Number(totalYears.toFixed(2)),
        totalUses,
        totalHoursUsed
      },
      unitCosts: {
        costPerDay: Number(((netOutOfPocketCost + biasReport.interestFeeTotal) / totalDays).toFixed(1)),
        costPerMonth: Math.round((netOutOfPocketCost + biasReport.interestFeeTotal) / totalMonths),
        costPerUse: Number(((netOutOfPocketCost + biasReport.interestFeeTotal) / totalUses).toFixed(1)),
        costPerHourUsed: Number(((netOutOfPocketCost + biasReport.interestFeeTotal) / totalHoursUsed).toFixed(1)),
        dailyBenchmark: matchEverydayBenchmark((netOutOfPocketCost + biasReport.interestFeeTotal) / totalDays),
        perUseBenchmark: matchEverydayBenchmark((netOutOfPocketCost + biasReport.interestFeeTotal) / totalUses)
      },
      laborMetrics: {
        effectiveHourlyWage,
        nominalHourlyWage: wageData.nominalHourlyWage,
        psychologicalHourlyWage: wageData.psychologicalHourlyWage,
        requiredWorkHoursInitial,
        requiredWorkHoursNet: Number((Math.max(0, netOutOfPocketCost + biasReport.interestFeeTotal) / effectiveHourlyWage).toFixed(1)),
        requiredWorkDaysNet: Number(((Math.max(0, netOutOfPocketCost + biasReport.interestFeeTotal) / effectiveHourlyWage) / workHoursPerDay).toFixed(1)),
        workHoursPerDay,
        wageDetails: wageData
      },
      returnMetrics: {
        totalTimeSavedHours,
        timeSavedMonetaryValue,
        totalMoneySaved,
        totalBenefitValue: Math.round(timeSavedMonetaryValue + totalMoneySaved),
        paybackRatioPercent: (netOutOfPocketCost + biasReport.interestFeeTotal) > 0
          ? Math.round(((timeSavedMonetaryValue + totalMoneySaved) / (netOutOfPocketCost + biasReport.interestFeeTotal)) * 100)
          : 100
      },
      opportunityCost,
      biasReport,
      evaluation
    };
  }

  /**
   * 4.5 行動経済学バイアス＆セール・分割払いの罠チェッカー
   */
  function analyzeCognitiveBiases(item = {}, initialOutlay = 0, effectiveHourlyWage = 1250) {
    // 1) セール割引のアンカリング効果テスト: 「もしセールではなく定価だったとしても欲しかったか？」
    const saleTrapTriggered = item.wouldBuyAtFullPrice === false || item.wouldBuyAtFullPrice === 'no';
    // 2) 現金選好テスト: 「この商品か、同額の非課税現金をタダでもらえるならどっちを選ぶか？」
    const cashTestFailed = item.cashPreferenceTest === 'cash';
    // 3) 分割払い・リボ払い手数料トラップ
    const paymentMethod = item.paymentMethod || 'lump_sum';
    let interestFeeTotal = 0;
    let extraWorkHoursForInterest = 0;

    if (paymentMethod === 'revolving_15') {
      // リボ払い・高金利分割（実質年率15%・24ヶ月元利均等相当の概算手数料 約16.4%）
      interestFeeTotal = Math.round(initialOutlay * 0.164);
      extraWorkHoursForInterest = Number((interestFeeTotal / Math.max(100, effectiveHourlyWage)).toFixed(1));
    } else if (paymentMethod === 'installment_loan_8') {
      // 一般分割手数料（実質年率8%・12〜24ヶ月相当 約8.5%）
      interestFeeTotal = Math.round(initialOutlay * 0.085);
      extraWorkHoursForInterest = Number((interestFeeTotal / Math.max(100, effectiveHourlyWage)).toFixed(1));
    }

    let scorePenalty = 0;
    const biasWarnings = [];
    const biasPasses = [];

    if (saleTrapTriggered) {
      scorePenalty += 16;
      biasWarnings.push('🚨【アンカリング効果（セールの罠）検出】「定価なら買わない」ものは、商品そのものではなく『割引されたお得感』を買わされています！');
    } else if (item.wouldBuyAtFullPrice === 'yes') {
      biasPasses.push('定価でも欲しいと断言できるため、セール煽りによる一時的な錯覚ではありません。');
    }

    if (cashTestFailed) {
      scorePenalty += 18;
      biasWarnings.push(`🚨【現金選好テスト不合格】目の前で「この商品」より「現金${Math.round(initialOutlay).toLocaleString()}円」を選ぶなら、あなたにとってこの商品の価値は支払金額未満です！`);
    } else if (item.cashPreferenceTest === 'item') {
      biasPasses.push('同額の現金よりこの商品を選ぶほど、あなたにとって明確な使用価値があります。');
    }

    if (interestFeeTotal > 0) {
      scorePenalty += 20;
      biasWarnings.push(`🚨【金利手数料の罠】リボ・金利付分割により、利息だけで「+${interestFeeTotal.toLocaleString()}円（余計な労働 ${extraWorkHoursForInterest} 時間分）」がドブに消えます！`);
    }

    return {
      saleTrapTriggered,
      cashTestFailed,
      paymentMethod,
      interestFeeTotal,
      extraWorkHoursForInterest,
      scorePenalty,
      biasWarnings,
      biasPasses
    };
  }

  /**
   * 5. 買い物の総合判定ロジック（S / A / B / C / D ランクと具体的アドバイス生成）
   */
  function evaluatePurchaseVerdict(metrics) {
    const {
      netOutOfPocketCost,
      economicNetCost,
      costPerUse,
      costPerHourUsed,
      costPerDay,
      effectiveHourlyWage,
      totalUses,
      totalTimeSavedHours,
      totalMoneySaved,
      resaleValue,
      initialOutlay,
      satisfactionScore,
      requiredWorkDaysNet,
      biasReport
    } = metrics;

    let score = 50; // ベーススコア
    const reasons = [];
    const warnings = [];

    // 0) 行動経済学バイアス（セール罠・現金選好テスト・分割/リボ金利罠）の反映
    if (biasReport) {
      if (biasReport.scorePenalty > 0) {
        score -= biasReport.scorePenalty;
      }
      if (Array.isArray(biasReport.biasWarnings)) {
        biasReport.biasWarnings.forEach((w) => warnings.push(w));
      }
      if (Array.isArray(biasReport.biasPasses)) {
        biasReport.biasPasses.forEach((p) => reasons.push(p));
      }
    }

    // 1) 時短・金銭節約による元取れ度合い（連続スケールで精緻に評価）
    const totalBenefit = (totalTimeSavedHours * effectiveHourlyWage) + totalMoneySaved;
    const benefitRatio = netOutOfPocketCost > 0 ? totalBenefit / netOutOfPocketCost : 0;

    if (benefitRatio >= 2.0) {
      score += 24;
      reasons.push(`時短効果（計${totalTimeSavedHours}時間）と節約効果により、実質負担の${benefitRatio.toFixed(1)}倍のリターン（約${Math.round(Math.abs(economicNetCost)).toLocaleString()}円のプラス収支）を生む「時間を買う神投資」です。`);
    } else if (benefitRatio >= 1.0) {
      score += 18;
      reasons.push(`時短・節約効果だけで購入コストの100%以上（約${Math.round(totalBenefit).toLocaleString()}円相当）を回収でき、経済的に元が取れます。`);
    } else if (benefitRatio >= 0.35) {
      score += 10;
      reasons.push(`時間短縮・節約によって実質負担の約${Math.round(benefitRatio * 100)}%を回収できます。`);
    }

    // 2) 使用1時間あたりコスト vs 自分の実効時給
    const hourlyRatio = effectiveHourlyWage > 0 ? costPerHourUsed / effectiveHourlyWage : 1;
    if (hourlyRatio <= 0.02) {
      score += 15;
      reasons.push(`使用1時間あたりのコスト（${costPerHourUsed.toLocaleString()}円）があなたの実効時給の2%以下で、時間単価が極めて優秀です。`);
    } else if (hourlyRatio <= 0.08) {
      score += 10;
      reasons.push(`1時間あたり${costPerHourUsed.toLocaleString()}円で活用でき、実効時給に対して十分なコスパがあります。`);
    } else if (hourlyRatio <= 0.25) {
      score += 4;
      reasons.push(`1時間あたり${costPerHourUsed.toLocaleString()}円と、無理のない健全なコスト水準です。`);
    } else if (hourlyRatio >= 1.5) {
      score -= 20;
      warnings.push(`使う時間1時間あたりのコスト（${costPerHourUsed.toLocaleString()}円）が、あなたが1時間働いて得る実効手取り（${effectiveHourlyWage.toLocaleString()}円）を大きく上回っています。`);
    } else if (hourlyRatio >= 0.7) {
      score -= 10;
      warnings.push(`使用時間に対するコストがやや高めです。レンタルやシェア、中古品も検討余地があります。`);
    }

    // 3) 使用回数・死蔵リスク
    if (totalUses <= 5 && netOutOfPocketCost >= 10000) {
      score -= 22;
      warnings.push(`総使用回数が約${totalUses}回と少なく、1回あたり${Math.round(costPerUse).toLocaleString()}円の「タンスの肥やし」になるリスクが高いです。`);
    } else if (totalUses <= 25 && netOutOfPocketCost >= 30000) {
      score -= 10;
      warnings.push(`価格に対して使用頻度が控えめ（計${totalUses}回想定）です。本当に継続して使うか再確認しましょう。`);
    } else if (totalUses >= 1000) {
      score += 9;
      reasons.push(`合計${totalUses.toLocaleString()}回以上使う超高頻度アイテムのため、1回あたりの摩耗コストが最小化されています。`);
    } else if (totalUses >= 300) {
      score += 5;
      reasons.push(`合計${totalUses.toLocaleString()}回以上使う日常アイテムのため、日割りコストが安定しています。`);
    }

    // 4) リセールバリュー（資産性）
    const resaleRatio = initialOutlay > 0 ? resaleValue / initialOutlay : 0;
    if (resaleRatio >= 0.5) {
      score += 8;
      reasons.push(`リセールバリューが高く（予想売却額 ${resaleValue.toLocaleString()}円 / ${Math.round(resaleRatio * 100)}%）、手放す時に資金の半分以上が戻ってくる「資産性の高い買い物」です。`);
    } else if (resaleRatio >= 0.3) {
      score += 4;
      reasons.push(`使用後も約${resaleValue.toLocaleString()}円での売却が見込め、実質負担を抑えられます。`);
    }

    // 5) 満足度・QOL貢献
    if (satisfactionScore >= 5) {
      score += 8;
      reasons.push(`あなたの人生の満足度・健康・モチベーションへの貢献度が最大級（★5）です。`);
    } else if (satisfactionScore === 4) {
      score += 4;
    } else if (satisfactionScore <= 2) {
      score -= 14;
      warnings.push(`ワクワク度・必要性が低い（★${satisfactionScore}）ため、「なんとなくの衝動買い・惰性支出」の可能性があります。48時間冷却ボックスに入れましょう。`);
    }

    // 6) 労働日数の重み（手取り労働に対する負担感）
    if (requiredWorkDaysNet >= 25 && benefitRatio < 0.8) {
      score -= 8;
      warnings.push(`実質負担分を稼ぐだけで約${requiredWorkDaysNet}営業日（1ヶ月以上の労働）が必要です。`);
    } else if (requiredWorkDaysNet <= 1.5 && satisfactionScore >= 4) {
      score += 4;
      reasons.push(`約${requiredWorkDaysNet}日分の労働で手に入るため、家計へのダメージが小さい買い物です。`);
    }

    const clampedScore = Math.max(5, Math.min(98, Math.round(score)));

    let rank = 'B';
    let badgeText = '条件付きでアリ（冷静に比較を）';
    let categoryType = 'standard';
    let colorClass = 'rank-b';
    let recommendationAction = 'cooling_48h';

    if (clampedScore >= 85) {
      rank = 'S';
      badgeText = '即決レベルの「神投資」（時間を買う買い物）';
      categoryType = 'investment';
      colorClass = 'rank-s';
      recommendationAction = 'buy_confident';
    } else if (clampedScore >= 70) {
      rank = 'A';
      badgeText = '納得の好コスパ（買って後悔しにくい）';
      categoryType = 'good_buy';
      colorClass = 'rank-a';
      recommendationAction = 'buy_confident';
    } else if (clampedScore >= 50) {
      rank = 'B';
      badgeText = '標準的（48時間寝かせて熱が冷めなければGO）';
      categoryType = 'standard';
      colorClass = 'rank-b';
      recommendationAction = 'cooling_48h';
    } else if (clampedScore >= 35) {
      rank = 'C';
      badgeText = '要注意！コスパ悪化・死蔵リスクあり';
      categoryType = 'warning';
      colorClass = 'rank-c';
      recommendationAction = 'cooling_48h';
    } else {
      rank = 'D';
      badgeText = '衝動買い警報！見送り貯金箱へ入れるべき';
      categoryType = 'impulse_danger';
      colorClass = 'rank-d';
      recommendationAction = 'skip_and_save';
    }

    return {
      score: clampedScore,
      rank,
      badgeText,
      categoryType,
      colorClass,
      recommendationAction,
      reasons,
      warnings
    };
  }

  /**
   * 6. A/B 比較モード（「安物買いの銭失い」vs「長期・高リセール・時短モデル」の損益分岐シミュレーション）
   */
  function compareTwoOptions(optionA, optionB, userProfile = {}, compareYears = 5) {
    const resultA = analyzePurchase(optionA, userProfile);
    const resultB = analyzePurchase(optionB, userProfile);
    const wage = calculateEffectiveHourlyWage(userProfile).effectiveHourlyWage;

    const totalMonths = Math.max(12, Math.round(toSafeNumber(compareYears, 5, 1, 20) * 12));
    const monthlySeries = [];
    let crossoverMonth = null;

    // 複数年スパンで買い替えサイクルも含めた実質累積コスト（時短・節約効果差し引き後）を計算
    const lifespanMonthsA = Math.max(1, resultA.itemSummary.totalMonths);
    const lifespanMonthsB = Math.max(1, resultB.itemSummary.totalMonths);

    const monthlyBenefitA = (resultA.returnMetrics.totalBenefitValue / lifespanMonthsA);
    const monthlyBenefitB = (resultB.returnMetrics.totalBenefitValue / lifespanMonthsB);

    const monthlyNetBurnA = (resultA.itemSummary.netOutOfPocketCost / lifespanMonthsA) - monthlyBenefitA;
    const monthlyNetBurnB = (resultB.itemSummary.netOutOfPocketCost / lifespanMonthsB) - monthlyBenefitB;

    for (let m = 0; m <= totalMonths; m++) {
      // 初期費用＋経過月分の償却（買い替え発生時は旧機種の売却益を確定し、現在使用中機種は経過月比率で評価）
      const replacementsA = m === 0 ? 0 : Math.floor((m - 1) / lifespanMonthsA);
      const replacementsB = m === 0 ? 0 : Math.floor((m - 1) / lifespanMonthsB);

      const cycleProgressA = m === 0 ? 0 : ((m - 1) % lifespanMonthsA + 1) / lifespanMonthsA;
      const cycleProgressB = m === 0 ? 0 : ((m - 1) % lifespanMonthsB + 1) / lifespanMonthsB;

      const cumCostA = Math.round(
        optionA.purchaseType === 'subscription'
          ? m * monthlyNetBurnA
          : m === 0
            ? 0
            : (resultA.itemSummary.initialOutlay * (1 + replacementsA)) - (resultA.itemSummary.resaleValue * (replacementsA + cycleProgressA)) + (m * (resultA.itemSummary.totalMaintenanceCost / lifespanMonthsA)) - (m * monthlyBenefitA)
      );

      const cumCostB = Math.round(
        optionB.purchaseType === 'subscription'
          ? m * monthlyNetBurnB
          : m === 0
            ? 0
            : (resultB.itemSummary.initialOutlay * (1 + replacementsB)) - (resultB.itemSummary.resaleValue * (replacementsB + cycleProgressB)) + (m * (resultB.itemSummary.totalMaintenanceCost / lifespanMonthsB)) - (m * monthlyBenefitB)
      );

      monthlySeries.push({
        month: m,
        cumulativeNetCostA: cumCostA,
        cumulativeNetCostB: cumCostB
      });
    }

    // 1ヶ月目時点で高かった方が、何ヶ月目に逆転して安くなるか（損益分岐点）を算出
    if (monthlySeries.length > 2) {
      const month1CheaperIsA = monthlySeries[1].cumulativeNetCostA <= monthlySeries[1].cumulativeNetCostB;
      for (let m = 2; m <= totalMonths; m++) {
        const curA = monthlySeries[m].cumulativeNetCostA;
        const curB = monthlySeries[m].cumulativeNetCostB;
        if (month1CheaperIsA && curB < curA) {
          crossoverMonth = m;
          break;
        } else if (!month1CheaperIsA && curA < curB) {
          crossoverMonth = m;
          break;
        }
      }
    }

    const finalA = monthlySeries[monthlySeries.length - 1].cumulativeNetCostA;
    const finalB = monthlySeries[monthlySeries.length - 1].cumulativeNetCostB;
    const winner = finalA <= finalB ? 'A' : 'B';
    const costDifference = Math.abs(finalA - finalB);
    const workHoursDifference = Number((costDifference / wage).toFixed(1));

    return {
      optionA: resultA,
      optionB: resultB,
      compareYears,
      crossoverMonth,
      winner,
      costDifference,
      workHoursDifference,
      monthlySeries
    };
  }

  /**
   * 7. パートナー・家族への購入稟議書（LINE/メッセージ説得プレゼン文）自動生成エンジン
   */
  function generateFamilyPitchText(analysisResult) {
    if (!analysisResult) return { logical: '', daily: '', selfControl: '' };
    const s = analysisResult.itemSummary;
    const u = analysisResult.unitCosts;
    const r = analysisResult.returnMetrics;
    const ev = analysisResult.evaluation;

    const logical = [
      `【相談】「${s.name}」の導入について数字で計算してみたんだけど、少し見てほしい🙏`,
      `・初期価格は ${s.initialOutlay.toLocaleString()}円 なんだけど、${s.totalYears}年使った後の売却相場（約${s.resaleValue.toLocaleString()}円）を差し引くと、実質負担は ${s.netOutOfPocketCost.toLocaleString()}円 になる計算。`,
      r.totalTimeSavedHours > 0
        ? `・しかもこれで合計 ${r.totalTimeSavedHours}時間（丸 ${(r.totalTimeSavedHours / 24).toFixed(1)}日分！）の家事・作業時間が浮くから、時給換算すると約 ${r.totalBenefitValue.toLocaleString()}円分の価値が生まれて、実質しっかり元が取れるんだよね✨`
        : `・1日あたりに直すと「たった ${u.costPerDay}円（${u.dailyBenchmark.primaryText}）」で毎日快適になる計算！`,
      `衝動買いじゃなくてちゃんと維持費やリセールまで計算した上で「Rank ${ev.rank}（${ev.score}点）」だったから、前向きに検討したいな！どう思う？`
    ].join('\n');

    const daily = [
      `ねえねえ、「${s.name}」って一見 ${s.initialOutlay.toLocaleString()}円 で高く見えるじゃん？`,
      `でも ${s.totalYears}年間（計${s.totalUses.toLocaleString()}回）使う前提でリセール（-${s.resaleValue.toLocaleString()}円）を引いて日割り計算したら、`,
      `なんと【1日あたり ${u.costPerDay}円（1回 ${u.costPerUse}円 ＝ ${u.dailyBenchmark.primaryText}）】だった！😳`,
      `毎日の満足度や健康を考えるとめちゃくちゃコスパ良いと思うんだけど、どうかな？`
    ].join('\n');

    const selfControl = [
      `【買わない宣言🐷】「${s.name}（${s.initialOutlay.toLocaleString()}円）」、一瞬欲しくなったけどValueLensで冷静に計算してみた。`,
      `・自分の真の実効時給（${analysisResult.laborMetrics.effectiveHourlyWage.toLocaleString()}円）で換算すると、これ1個のために「${analysisResult.laborMetrics.requiredWorkHoursNet}時間（約${analysisResult.laborMetrics.requiredWorkDaysNet}営業日）」も余計に働かないといけない。`,
      `・買わずに年利5%で10年インデックス運用したら「${(analysisResult.opportunityCost.projections[10]?.futureValue || 0).toLocaleString()}円」に育つ。`,
      `判定も「Rank ${ev.rank}（${ev.score}点）」だったし、今回は見送って貯金箱に +${s.netOutOfPocketCost.toLocaleString()}円 チャリンします！💪`
    ].join('\n');

    return {
      logical,
      daily,
      selfControl
    };
  }

  /**
   * 8. サブスク＆固定費 一括断捨離仕分けマトリクス計算エンジン
   */
  function auditSubscriptionsPortfolio(subItems = [], userProfile = {}) {
    const wageData = calculateEffectiveHourlyWage(userProfile);
    const effectiveWage = wageData.effectiveHourlyWage;

    const evaluatedSubs = subItems.map((sub) => {
      const active = sub.active !== false;
      const monthlyCost = toSafeNumber(sub.monthlyCost, 1000, 0, 1000000);
      const usesPerMonth = toSafeNumber(sub.usesPerMonth, 4, 0, 500);
      const minutesPerUse = toSafeNumber(sub.minutesPerUse, 45, 1, 1440);
      const satisfaction = toSafeNumber(sub.satisfaction, 3, 1, 5);

      const annualCost = Math.round(monthlyCost * 12);
      const costPerUse = usesPerMonth > 0 ? Math.round(monthlyCost / usesPerMonth) : monthlyCost;
      const hoursPerMonth = (usesPerMonth * minutesPerUse) / 60;
      const costPerHour = hoursPerMonth > 0 ? Math.round(monthlyCost / hoursPerMonth) : monthlyCost;

      // 10年間積立投資した場合の未来価値（年利5%月次複利）
      const r = 0.05 / 12;
      const n = 120;
      const future10Y = Math.round(monthlyCost * ((Math.pow(1 + r, n) - 1) / r));

      // 仕分け判定（神サブスク keep_god / 要見直し review / 即解約推奨 cut_immediately）
      let status = 'review';
      let statusLabel = '⚠️ 要見直し（都度課金・代替検討）';
      let reason = '利用頻度に対して月額がやや割高です。必要な月だけ契約する方法も検討しましょう。';

      if (usesPerMonth <= 1.5 || satisfaction <= 2 || (costPerHour > effectiveWage * 0.8 && satisfaction <= 3)) {
        status = 'cut_immediately';
        statusLabel = '✂️ 即解約推奨（幽霊サブスク）';
        reason = usesPerMonth <= 1.5
          ? `月${usesPerMonth}回しか使っておらず、1回あたり${costPerUse.toLocaleString()}円の「寄付状態」になっています！`
          : `満足度（★${satisfaction}）と利用時間に対してコストが見合っていません。`;
      } else if (costPerHour <= 250 || (satisfaction >= 4 && usesPerMonth >= 8)) {
        status = 'keep_god';
        statusLabel = '👑 継続推奨（神サブスク）';
        reason = `1時間あたり約${costPerHour.toLocaleString()}円と高コスパで、生活満足度にしっかり貢献しています。`;
      }

      return {
        ...sub,
        active,
        monthlyCost,
        usesPerMonth,
        minutesPerUse,
        satisfaction,
        annualCost,
        costPerUse,
        costPerHour,
        future10Y,
        status,
        statusLabel,
        reason
      };
    });

    const activeSubs = evaluatedSubs.filter((s) => s.active);
    const totalMonthly = activeSubs.reduce((sum, s) => sum + s.monthlyCost, 0);
    const totalAnnual = totalMonthly * 12;
    const r = 0.05 / 12;
    const totalFuture10Y = Math.round(totalMonthly * ((Math.pow(1 + r, 120) - 1) / r));

    const cutCandidates = activeSubs.filter((s) => s.status === 'cut_immediately' || s.status === 'review');
    const immediateCutCandidates = activeSubs.filter((s) => s.status === 'cut_immediately');

    const savableMonthly = immediateCutCandidates.reduce((sum, s) => sum + s.monthlyCost, 0);
    const savableAnnual = savableMonthly * 12;
    const savableWorkHoursPerYear = Number((savableAnnual / Math.max(100, effectiveWage)).toFixed(1));
    const savableFuture10Y = Math.round(savableMonthly * ((Math.pow(1 + r, 120) - 1) / r));

    return {
      evaluatedSubs,
      activeCount: activeSubs.length,
      totalMonthly,
      totalAnnual,
      totalFuture10Y,
      totalWorkHoursPerYear: Number((totalAnnual / Math.max(100, effectiveWage)).toFixed(1)),
      immediateCutCount: immediateCutCandidates.length,
      reviewCount: cutCandidates.length - immediateCutCandidates.length,
      savableMonthly,
      savableAnnual,
      savableWorkHoursPerYear,
      savableFuture10Y
    };
  }

  /**
   * 9. サーバーレスURLクエリ共有エンコーダー＆デコーダー
   */
  function encodeItemToQuery(item = {}) {
    const params = new URLSearchParams();
    if (item.name) params.set('n', item.name);
    if (item.purchaseType) params.set('pt', item.purchaseType);
    if (item.billingCycle) params.set('bc', item.billingCycle);
    params.set('p', String(toSafeNumber(item.price, 0)));
    params.set('y', String(toSafeNumber(item.yearsToUse, 2)));
    params.set('m', String(toSafeNumber(item.monthsToUse, 0)));
    if (item.frequencyType) params.set('ft', item.frequencyType);
    params.set('fc', String(toSafeNumber(item.frequencyCount, 1)));
    params.set('min', String(toSafeNumber(item.minutesPerUse, 60)));
    params.set('rs', String(toSafeNumber(item.resaleRatePercent, 0)));
    params.set('mt', String(toSafeNumber(item.annualMaintenanceCost, 0)));
    params.set('ts', String(toSafeNumber(item.timeSavedMinutesPerUse, 0)));
    params.set('ms', String(toSafeNumber(item.moneySavedPerUse, 0)));
    params.set('sat', String(toSafeNumber(item.satisfactionScore, 3)));
    if (item.wouldBuyAtFullPrice) params.set('bfp', String(item.wouldBuyAtFullPrice));
    if (item.cashPreferenceTest) params.set('cpt', String(item.cashPreferenceTest));
    if (item.paymentMethod) params.set('pm', String(item.paymentMethod));
    return params.toString();
  }

  function decodeItemFromQuery(queryString = '') {
    const clean = queryString.startsWith('?') ? queryString.slice(1) : queryString;
    if (!clean) return null;
    const params = new URLSearchParams(clean);
    if (!params.has('p') && !params.has('n')) return null;

    return {
      name: params.get('n') || '共有された検討アイテム',
      purchaseType: params.get('pt') === 'subscription' ? 'subscription' : 'one_time',
      billingCycle: params.get('bc') || 'monthly',
      price: toSafeNumber(params.get('p'), 30000, 0),
      yearsToUse: toSafeNumber(params.get('y'), 2, 0),
      monthsToUse: toSafeNumber(params.get('m'), 0, 0),
      frequencyType: params.get('ft') || 'daily',
      frequencyCount: toSafeNumber(params.get('fc'), 1, 0.1),
      minutesPerUse: toSafeNumber(params.get('min'), 60, 1),
      resaleRatePercent: toSafeNumber(params.get('rs'), 0, 0, 95),
      annualMaintenanceCost: toSafeNumber(params.get('mt'), 0, 0),
      timeSavedMinutesPerUse: toSafeNumber(params.get('ts'), 0, 0),
      moneySavedPerUse: toSafeNumber(params.get('ms'), 0, 0),
      satisfactionScore: toSafeNumber(params.get('sat'), 3, 1, 5),
      wouldBuyAtFullPrice: params.get('bfp') || 'yes',
      cashPreferenceTest: params.get('cpt') || 'item',
      paymentMethod: params.get('pm') || 'lump_sum'
    };
  }

  return {
    EVERYDAY_BENCHMARKS,
    calculateEffectiveHourlyWage,
    calculateOpportunityCost,
    matchEverydayBenchmark,
    analyzeCognitiveBiases,
    analyzePurchase,
    evaluatePurchaseVerdict,
    compareTwoOptions,
    generateFamilyPitchText,
    auditSubscriptionsPortfolio,
    encodeItemToQuery,
    decodeItemFromQuery
  };
});
