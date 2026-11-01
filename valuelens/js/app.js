/**
 * ValueLens (バリューレンズ) - Main Application Controller (v3.0 Complete Edition)
 * Connects Engine, Presets, Visuals, Bias Checker, Family Pitch, Subscription Studio,
 * Cooling Box, Piggy Bank, URL Query Sharing, and LocalStorage
 */
(function () {
  'use strict';

  const Engine = window.ValueLensEngine;
  const Presets = window.ValueLensPresets;
  const Visuals = window.ValueLensVisuals;

  const STORAGE_KEYS = {
    THEME: 'valuelens_theme_v1',
    USER_PROFILE: 'valuelens_profile_v1',
    COOLING_LIST: 'valuelens_cooling_v1',
    DECISION_HISTORY: 'valuelens_history_v1',
    SUB_PORTFOLIO: 'valuelens_subs_v1'
  };

  // --- アプリケーション状態 ---
  const state = {
    theme: 'dark',
    activeTab: 'tab-simulator',
    selectedCategory: 'all',
    selectedPresetId: 'iphone_pro',
    pitchMode: 'logical',
    lastRecordedSignature: '',
    lastRecordedTime: 0,
    currentItem: {
      name: '最新ハイエンドスマホ (iPhone等)',
      purchaseType: 'one_time',
      billingCycle: 'monthly',
      price: 159800,
      yearsToUse: 2,
      monthsToUse: 0,
      frequencyType: 'daily',
      frequencyCount: 1,
      minutesPerUse: 180,
      resaleRatePercent: 58,
      annualMaintenanceCost: 1500,
      timeSavedMinutesPerUse: 10,
      moneySavedPerUse: 0,
      satisfactionScore: 5,
      investmentRatePercent: 5.0,
      wouldBuyAtFullPrice: 'yes',
      cashPreferenceTest: 'item',
      paymentMethod: 'lump_sum'
    },
    userProfile: {
      incomeMode: 'monthly',
      monthlyTakeHome: 260000,
      annualTakeHome: 3600000,
      directHourlyWage: 1500,
      workDaysPerMonth: 20,
      workHoursPerDay: 8,
      overtimeHoursPerMonth: 20,
      commuteMinutesPerDay: 60,
      workExpensesPerMonth: 10000,
      stressLevel: 3
    },
    subPortfolio: [],
    coolingItems: [],
    decisionHistory: [],
    lastAnalysis: null,
    lastBattleResult: null,
    lastSubAudit: null
  };

  // --- LocalStorage 読み書き ---
  function loadStateFromStorage() {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        state.theme = savedTheme;
      }

      const savedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (savedProfile) {
        state.userProfile = { ...state.userProfile, ...JSON.parse(savedProfile) };
      }

      const savedSubs = localStorage.getItem(STORAGE_KEYS.SUB_PORTFOLIO);
      if (savedSubs) {
        state.subPortfolio = JSON.parse(savedSubs) || [];
      } else {
        state.subPortfolio = JSON.parse(JSON.stringify(Presets.DEFAULT_SUBSCRIPTION_PORTFOLIO));
      }

      const savedCooling = localStorage.getItem(STORAGE_KEYS.COOLING_LIST);
      if (savedCooling) {
        state.coolingItems = JSON.parse(savedCooling) || [];
      } else {
        state.coolingItems = [
          {
            id: 'sample_cool_1',
            name: 'セールで見かけたワイヤレススピーカー',
            netCost: 18500,
            initialPrice: 22000,
            workHours: 14.8,
            rank: 'C',
            score: 42,
            addedAt: Date.now() - 12 * 3600 * 1000,
            expiresAt: Date.now() + 36 * 3600 * 1000,
            itemSnapshot: {
              name: 'セールで見かけたワイヤレススピーカー',
              purchaseType: 'one_time',
              price: 22000,
              yearsToUse: 2,
              monthsToUse: 0,
              frequencyType: 'monthly',
              frequencyCount: 2,
              minutesPerUse: 45,
              resaleRatePercent: 15,
              annualMaintenanceCost: 0,
              timeSavedMinutesPerUse: 0,
              moneySavedPerUse: 0,
              satisfactionScore: 2,
              wouldBuyAtFullPrice: 'no',
              cashPreferenceTest: 'cash',
              paymentMethod: 'lump_sum'
            }
          }
        ];
      }

      const savedHistory = localStorage.getItem(STORAGE_KEYS.DECISION_HISTORY);
      if (savedHistory) {
        state.decisionHistory = JSON.parse(savedHistory) || [];
      }

      // URLクエリパラメータから共有アイテムの復元
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const decoded = Engine.decodeItemFromQuery(window.location.search);
        if (decoded) {
          state.currentItem = { ...state.currentItem, ...decoded };
          state.selectedPresetId = '';
        }
      }
    } catch (e) {
      console.warn('Storage load fallback:', e);
    }
  }

  function saveStateToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(state.userProfile));
      localStorage.setItem(STORAGE_KEYS.SUB_PORTFOLIO, JSON.stringify(state.subPortfolio));
      localStorage.setItem(STORAGE_KEYS.COOLING_LIST, JSON.stringify(state.coolingItems));
      localStorage.setItem(STORAGE_KEYS.DECISION_HISTORY, JSON.stringify(state.decisionHistory));
    } catch (e) {
      console.warn('Storage save fallback:', e);
    }
  }

  // --- トースト通知 ---
  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, 3400);
  }

  // --- テーマ適用 ---
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const iconEl = document.getElementById('themeIcon');
    const labelEl = document.getElementById('themeLabel');
    if (iconEl && labelEl) {
      if (state.theme === 'dark') {
        iconEl.textContent = '☀️';
        labelEl.textContent = 'ライト';
      } else {
        iconEl.textContent = '🌙';
        labelEl.textContent = 'ダーク';
      }
    }
    if (state.lastAnalysis) {
      Visuals.renderOpportunityChart(
        document.getElementById('opportunityChartCanvas'),
        state.lastAnalysis,
        state.theme === 'dark'
      );
    }
    if (state.lastBattleResult) {
      Visuals.renderABComparisonChart(
        document.getElementById('abChartCanvas'),
        state.lastBattleResult,
        state.theme === 'dark'
      );
    }
    if (state.lastSubAudit) {
      Visuals.renderSubscriptionBubbleChart(
        document.getElementById('subMatrixCanvas'),
        state.lastSubAudit,
        state.theme === 'dark'
      );
    }
  }

  // --- タブ切り替え ---
  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === tabId);
    });

    const mobileBar = document.getElementById('mobileStickyBar');
    if (mobileBar) {
      mobileBar.classList.toggle('visible-mobile', tabId === 'tab-simulator');
    }

    if (tabId === 'tab-simulator' && state.lastAnalysis) {
      setTimeout(() => {
        Visuals.renderOpportunityChart(
          document.getElementById('opportunityChartCanvas'),
          state.lastAnalysis,
          state.theme === 'dark'
        );
      }, 30);
    } else if (tabId === 'tab-battle') {
      setTimeout(() => runABBattleCalculation(), 30);
    } else if (tabId === 'tab-subs') {
      setTimeout(() => renderSubscriptionsStudioTab(), 30);
    } else if (tabId === 'tab-piggy') {
      renderCoolingAndPiggyTab();
    } else if (tabId === 'tab-wage') {
      renderWageTab();
    }
  }

  // --- プリセット一覧の描画 ---
  function renderPresetsGrid() {
    const grid = document.getElementById('presetGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = state.selectedCategory === 'all'
      ? Presets.ITEM_PRESETS
      : Presets.ITEM_PRESETS.filter((p) => p.category === state.selectedCategory);

    filtered.forEach((preset) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `preset-card ${state.selectedPresetId === preset.id ? 'selected' : ''}`;
      const priceLabel = preset.purchaseType === 'subscription'
        ? `月額 ${preset.price.toLocaleString()}円`
        : `${preset.price.toLocaleString()}円`;

      card.innerHTML = `
        <div class="preset-card-top">
          <span>${preset.icon} ${preset.name}</span>
          <span class="preset-price-tag">${priceLabel}</span>
        </div>
        <div class="preset-card-desc">${preset.tagline}</div>
      `;

      card.addEventListener('click', () => {
        state.selectedPresetId = preset.id;
        applyPresetToForm(preset);
        renderPresetsGrid();
      });

      grid.appendChild(card);
    });
  }

  function applyPresetToForm(preset) {
    state.currentItem = {
      ...state.currentItem,
      name: preset.name,
      purchaseType: preset.purchaseType || 'one_time',
      billingCycle: preset.billingCycle || 'monthly',
      price: preset.price,
      yearsToUse: preset.yearsToUse,
      monthsToUse: preset.monthsToUse || 0,
      frequencyType: preset.frequencyType || 'daily',
      frequencyCount: preset.frequencyCount || 1,
      minutesPerUse: preset.minutesPerUse || 60,
      resaleRatePercent: preset.resaleRatePercent || 0,
      annualMaintenanceCost: preset.annualMaintenanceCost || 0,
      timeSavedMinutesPerUse: preset.timeSavedMinutesPerUse || 0,
      moneySavedPerUse: preset.moneySavedPerUse || 0,
      satisfactionScore: preset.satisfactionScore || 3,
      wouldBuyAtFullPrice: preset.wouldBuyAtFullPrice || 'yes',
      cashPreferenceTest: preset.cashPreferenceTest || 'item',
      paymentMethod: preset.paymentMethod || 'lump_sum'
    };
    syncFormInputsFromState();
    recalculateMainSimulator();
  }

  function syncFormInputsFromState() {
    const item = state.currentItem;
    document.getElementById('inputItemName').value = item.name;
    document.getElementById('inputPrice').value = item.price;
    const sliderPrice = document.getElementById('sliderPrice');
    sliderPrice.max = Math.max(300000, item.price * 1.5);
    sliderPrice.value = item.price;

    document.getElementById('inputBillingCycle').value = item.billingCycle || 'monthly';
    document.getElementById('inputYears').value = item.yearsToUse;
    document.getElementById('inputMonths').value = item.monthsToUse;
    document.getElementById('inputFreqType').value = item.frequencyType;
    document.getElementById('inputFreqCount').value = item.frequencyCount;
    document.getElementById('inputMinutesPerUse').value = item.minutesPerUse;
    document.getElementById('inputResaleRate').value = item.resaleRatePercent;
    document.getElementById('inputTimeSaved').value = item.timeSavedMinutesPerUse;
    document.getElementById('inputMoneySaved').value = item.moneySavedPerUse;
    document.getElementById('inputMaintenance').value = item.annualMaintenanceCost;
    document.getElementById('inputInvestRate').value = item.investmentRatePercent;

    document.getElementById('inputBiasFullPrice').value = item.wouldBuyAtFullPrice || 'yes';
    document.getElementById('inputBiasCashTest').value = item.cashPreferenceTest || 'item';
    document.getElementById('inputPaymentMethod').value = item.paymentMethod || 'lump_sum';

    const isSub = item.purchaseType === 'subscription';
    document.getElementById('btnTypeOneTime').classList.toggle('active', !isSub);
    document.getElementById('btnTypeSub').classList.toggle('active', isSub);
    document.getElementById('groupBillingCycle').style.display = isSub ? 'block' : 'none';
    document.getElementById('groupResale').style.display = isSub ? 'none' : 'block';
    document.getElementById('labelPrice').textContent = isSub ? 'サブスク料金（1回あたり支払額）' : '購入価格（税込）';

    document.querySelectorAll('#starSelector .star-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.star) === Number(item.satisfactionScore));
    });
    const starTexts = {
      1: '★1：惰性・見栄・ほぼ使わないかも',
      2: '★2：一時的な興味（すぐ飽きる懸念あり）',
      3: '★3：標準的な実用アイテム',
      4: '★4：生活が快適になり満足度が高い',
      5: '★5：人生が変わる・毎日の健康や時間が劇的改善'
    };
    document.getElementById('satisfactionText').textContent = starTexts[item.satisfactionScore] || starTexts[3];

    const freqLabels = { daily: '回/日', weekly: '回/週', monthly: '回/月', yearly: '回/年' };
    document.getElementById('freqUnitLabel').textContent = freqLabels[item.frequencyType] || '回';
  }

  function readFormInputsToState() {
    const item = state.currentItem;
    item.name = document.getElementById('inputItemName').value || '検討中のアイテム';
    item.price = Math.max(0, Number(document.getElementById('inputPrice').value) || 0);
    item.billingCycle = document.getElementById('inputBillingCycle').value;
    item.yearsToUse = Math.max(0, Number(document.getElementById('inputYears').value) || 0);
    item.monthsToUse = Math.max(0, Number(document.getElementById('inputMonths').value) || 0);
    if (item.yearsToUse === 0 && item.monthsToUse === 0) {
      item.monthsToUse = 1;
    }
    item.frequencyType = document.getElementById('inputFreqType').value;
    item.frequencyCount = Math.max(0.1, Number(document.getElementById('inputFreqCount').value) || 1);
    item.minutesPerUse = Math.max(1, Number(document.getElementById('inputMinutesPerUse').value) || 30);
    item.resaleRatePercent = Math.max(0, Math.min(95, Number(document.getElementById('inputResaleRate').value) || 0));
    item.timeSavedMinutesPerUse = Math.max(0, Number(document.getElementById('inputTimeSaved').value) || 0);
    item.moneySavedPerUse = Math.max(0, Number(document.getElementById('inputMoneySaved').value) || 0);
    item.annualMaintenanceCost = Math.max(0, Number(document.getElementById('inputMaintenance').value) || 0);
    item.investmentRatePercent = Math.max(0, Math.min(30, Number(document.getElementById('inputInvestRate').value) || 5.0));

    item.wouldBuyAtFullPrice = document.getElementById('inputBiasFullPrice').value;
    item.cashPreferenceTest = document.getElementById('inputBiasCashTest').value;
    item.paymentMethod = document.getElementById('inputPaymentMethod').value;

    const freqLabels = { daily: '回/日', weekly: '回/週', monthly: '回/月', yearly: '回/年' };
    document.getElementById('freqUnitLabel').textContent = freqLabels[item.frequencyType] || '回';
  }

  // --- メイン診断の計算＆DOM反映 ---
  function recalculateMainSimulator() {
    const res = Engine.analyzePurchase(state.currentItem, state.userProfile);
    state.lastAnalysis = res;

    document.getElementById('totalDaysHint').textContent = `約 ${res.itemSummary.totalDays.toLocaleString()} 日間`;
    document.getElementById('totalUsesHint').textContent = `総使用 ${res.itemSummary.totalUses.toLocaleString()} 回 (${res.itemSummary.totalHoursUsed.toLocaleString()} 時間)`;
    document.getElementById('resaleRateLabel').textContent = `${state.currentItem.resaleRatePercent}%`;
    document.getElementById('resaleYenPreview').textContent = `予想売却額: ${res.itemSummary.resaleValue.toLocaleString()}円`;

    const heroCard = document.getElementById('verdictHeroCard');
    heroCard.className = `verdict-hero ${res.evaluation.colorClass}`;
    document.getElementById('verdictRankLetter').textContent = res.evaluation.rank;
    document.getElementById('verdictScoreText').textContent = `${res.evaluation.score}点`;
    document.getElementById('verdictHeadline').textContent = res.evaluation.badgeText;

    const econNote = res.itemSummary.economicNetCost <= 0
      ? `時短・節約効果を入れると <strong>約 ${Math.abs(res.itemSummary.economicNetCost).toLocaleString()}円のプラス収支（完全黒字）</strong>！`
      : `時短・節約差し引き後の最終実質負担は <strong>${res.itemSummary.economicNetCost.toLocaleString()}円</strong>`;

    document.getElementById('verdictSubline').innerHTML =
      `総支払額 ${res.itemSummary.grossCost.toLocaleString()}円 − 売却予想 ${res.itemSummary.resaleValue.toLocaleString()}円 ＝ <strong>実質純負担 ${res.itemSummary.netOutOfPocketCost.toLocaleString()}円</strong>（${econNote}）`;

    const reasonsList = document.getElementById('verdictReasonsList');
    reasonsList.innerHTML = '';
    res.evaluation.reasons.forEach((r) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>✅</span><span>${r}</span>`;
      reasonsList.appendChild(li);
    });
    res.evaluation.warnings.forEach((w) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>⚠️</span><span>${w}</span>`;
      reasonsList.appendChild(li);
    });

    document.getElementById('btnSkipAndSaveLabel').textContent =
      `買わずに見送り貯金箱へ (+${res.itemSummary.netOutOfPocketCost.toLocaleString()}円)`;

    // レンズ1
    document.getElementById('resCostPerDay').textContent = res.unitCosts.costPerDay.toLocaleString();
    document.getElementById('resDailyBenchmarkText').textContent = res.unitCosts.dailyBenchmark.primaryText;
    document.getElementById('resCostPerUse').textContent = `${res.unitCosts.costPerUse.toLocaleString()} 円/回`;
    document.getElementById('resCostPerHour').textContent = `${res.unitCosts.costPerHourUsed.toLocaleString()} 円/時間`;
    document.getElementById('resGrossCost').textContent = `${res.itemSummary.grossCost.toLocaleString()} 円`;
    document.getElementById('resNetPocket').textContent = `${res.itemSummary.netOutOfPocketCost.toLocaleString()} 円`;

    // レンズ2
    document.getElementById('resWorkHoursNet').textContent = res.laborMetrics.requiredWorkHoursNet.toLocaleString();
    document.getElementById('resWorkDaysText').textContent = `出勤日数換算：約 ${res.laborMetrics.requiredWorkDaysNet} 営業日分`;
    const monthRatio = Math.round((res.laborMetrics.requiredWorkHoursNet / Math.max(1, res.laborMetrics.wageDetails.monthlyTotalBoundHours)) * 100);
    document.getElementById('resWorkMonthRatioText').textContent = `あなたの1ヶ月の総拘束時間の ${monthRatio}%`;
    document.getElementById('resWorkGaugeFill').style.width = `${Math.min(100, monthRatio)}%`;
    document.getElementById('resEffectiveWage').textContent = `${res.laborMetrics.effectiveHourlyWage.toLocaleString()} 円/時間`;
    document.getElementById('resWorkHoursInitial').textContent = `${res.laborMetrics.requiredWorkHoursInitial.toLocaleString()} 時間`;

    // レンズ3
    document.getElementById('resPaybackBadge').textContent = `回収率 ${res.returnMetrics.paybackRatioPercent}%`;
    document.getElementById('resTotalBenefit').textContent = `+${res.returnMetrics.totalBenefitValue.toLocaleString()}`;
    const econEl = document.getElementById('resEconomicNetText');
    if (res.itemSummary.economicNetCost <= 0) {
      econEl.style.color = 'var(--accent-emerald)';
      econEl.textContent = `🎉 約 ${Math.abs(res.itemSummary.economicNetCost).toLocaleString()}円の黒字（元が取れる！）`;
    } else {
      econEl.style.color = 'var(--text-primary)';
      econEl.textContent = `実質 ${res.itemSummary.economicNetCost.toLocaleString()} 円の純支出`;
    }
    const savedDays = (res.returnMetrics.totalTimeSavedHours / 24).toFixed(1);
    document.getElementById('resTimeSavedHours').textContent = `${res.returnMetrics.totalTimeSavedHours.toLocaleString()} 時間（丸 ${savedDays} 日分）`;
    document.getElementById('resTimeSavedYen').textContent = `${res.returnMetrics.timeSavedMonetaryValue.toLocaleString()} 円相当`;

    // レンズ4
    const proj = res.opportunityCost.projections;
    document.getElementById('resOpp5Y').textContent = `${(proj[5]?.futureValue || 0).toLocaleString()} 円`;
    document.getElementById('resOpp10Y').textContent = `${(proj[10]?.futureValue || 0).toLocaleString()}`;
    document.getElementById('resOpp20Y').textContent = `${(proj[20]?.futureValue || 0).toLocaleString()} 円`;
    document.getElementById('resOpp30Y').textContent = `${(proj[30]?.futureValue || 0).toLocaleString()} 円`;
    document.getElementById('resOpp10YGain').textContent = `+${(proj[10]?.gain || 0).toLocaleString()} 円`;

    // 複利チャート
    Visuals.renderOpportunityChart(
      document.getElementById('opportunityChartCanvas'),
      res,
      state.theme === 'dark'
    );

    // 家族稟議書ジェネレーターの更新
    updateFamilyPitchBox(res);

    // 判定ランク＆文脈連動のスマート導線更新
    updateSmartActionLinks(res);

    // モバイル下部追従バー更新
    const mRank = document.getElementById('mobileStickyRank');
    const mMetrics = document.getElementById('mobileStickyMetrics');
    if (mRank && mMetrics) {
      mRank.textContent = `Rank ${res.evaluation.rank} (${res.evaluation.score}点)`;
      mMetrics.textContent = `1日 ${res.unitCosts.costPerDay}円 ｜ 労働 ${res.laborMetrics.requiredWorkHoursNet}h`;
    }

    updateHeaderStatusPills();
  }

  function updateFamilyPitchBox(res) {
    const pitches = Engine.generateFamilyPitchText(res);
    const textarea = document.getElementById('familyPitchTextarea');
    if (!textarea) return;
    textarea.value = pitches[state.pitchMode] || pitches.logical;
  }

  function updateSmartActionLinks(res) {
    const cleanQuery = encodeURIComponent(
      (state.currentItem.name || '').replace(/\(.*?\)|（.*?）/g, '').trim() || 'おすすめ'
    );
    document.getElementById('linkAmazonSearch').href = `https://www.amazon.co.jp/s?k=${cleanQuery}`;
    document.getElementById('linkRakutenSearch').href = `https://af.moshimo.com/af/c/click?a_id=5876771&p_id=54&pc_id=54&pl_id=616&url=${encodeURIComponent('https://search.rakuten.co.jp/search/mall/' + cleanQuery + '/')}`;
    // メルカリの「売り切れ（SOLD）」実売相場に直結！
    document.getElementById('linkMercariSoldSearch').href =
      `https://jp.mercari.com/search?keyword=${cleanQuery}&status=sold_out%7Ctrading`;

    const badge = document.getElementById('smartContextBadge');
    const advice = document.getElementById('smartActionAdvice');
    const fourthLink = document.getElementById('linkKakakuOrRentalSearch');
    const fourthLabel = document.getElementById('labelKakakuOrRental');

    if (res.evaluation.rank === 'C' || res.evaluation.rank === 'D' || res.itemSummary.totalUses <= 15) {
      badge.textContent = `Rank ${res.evaluation.rank}：買わずにレンタル・代替推奨`;
      advice.textContent =
        `💡 使用回数が少ない（計${res.itemSummary.totalUses}回想定）ため、購入すると1回あたり${res.unitCosts.costPerUse.toLocaleString()}円と割高です。買わずに「必要な数日だけ家電・機材レンタル」を使うと出費を80%以上抑えられます！`;
      fourthLabel.textContent = '📦 買わずに「レンタル相場」を検索して比較';
      fourthLink.href = `https://www.google.com/search?q=${cleanQuery}+レンタル+比較`;
    } else {
      badge.textContent = `Rank ${res.evaluation.rank}：最安値＆売却相場チェック推奨`;
      advice.textContent =
        `🎉 購入価値が十分に高いアイテムです！買う前に「価格.comの最安推移」と「メルカリの売り切れ（SOLD）実売相場」を30秒チェックすると、実質負担をさらに数千円〜数万円圧縮できます。`;
      fourthLabel.textContent = '📉 価格.comで最安推移をチェック';
      fourthLink.href = `https://kakaku.com/search_results/${cleanQuery}/`;
    }
  }

  // --- ヘッダーのステータスバッジ更新 ---
  function updateHeaderStatusPills() {
    const wageData = Engine.calculateEffectiveHourlyWage(state.userProfile);
    document.getElementById('headerEffectiveWage').textContent = `${wageData.effectiveHourlyWage.toLocaleString()}円/h`;
    document.getElementById('headerCoolingCount').textContent = `${state.coolingItems.length}件`;

    const totalSaved = state.decisionHistory
      .filter((h) => h.decision === 'skipped')
      .reduce((sum, h) => sum + (Number(h.savedAmount) || 0), 0);

    const rankInfo = Presets.getSaverRank(totalSaved);
    document.getElementById('headerRankIcon').textContent = rankInfo.icon;
    document.getElementById('headerSavedTotal').textContent = `${totalSaved.toLocaleString()}円`;
    document.getElementById('navPiggyBadge').textContent = state.coolingItems.length;
  }

  // --- A/B 比較バトルタブの描画＆計算 ---
  function renderABBattlePresets() {
    const grid = document.getElementById('abPresetGrid');
    if (!grid) return;
    grid.innerHTML = '';

    Presets.AB_BATTLE_PRESETS.forEach((bp) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'preset-card';
      card.innerHTML = `
        <div class="preset-card-top">
          <span>${bp.title}</span>
        </div>
        <div class="preset-card-desc">${bp.description}</div>
      `;
      card.addEventListener('click', () => {
        loadABBattlePreset(bp);
      });
      grid.appendChild(card);
    });
  }

  function loadABBattlePreset(bp) {
    document.getElementById('abCompareYears').value = bp.compareYears || 5;

    document.getElementById('abNameA').value = bp.optionA.name;
    document.getElementById('abPriceA').value = bp.optionA.price;
    document.getElementById('abTypeA').value = bp.optionA.purchaseType;
    document.getElementById('abYearsA').value = bp.optionA.yearsToUse;
    document.getElementById('abResaleA').value = bp.optionA.resaleRatePercent;
    document.getElementById('abTimeSavedA').value = bp.optionA.timeSavedMinutesPerUse || 0;
    document.getElementById('abMoneySavedA').value = bp.optionA.moneySavedPerUse || 0;
    document.getElementById('abFreqTypeA').value = bp.optionA.frequencyType === 'daily' ? 'daily' : 'weekly';
    document.getElementById('abMaintA').value = bp.optionA.annualMaintenanceCost || 0;

    document.getElementById('abNameB').value = bp.optionB.name;
    document.getElementById('abPriceB').value = bp.optionB.price;
    document.getElementById('abTypeB').value = bp.optionB.purchaseType;
    document.getElementById('abYearsB').value = bp.optionB.yearsToUse;
    document.getElementById('abResaleB').value = bp.optionB.resaleRatePercent;
    document.getElementById('abTimeSavedB').value = bp.optionB.timeSavedMinutesPerUse || 0;
    document.getElementById('abMoneySavedB').value = bp.optionB.moneySavedPerUse || 0;
    document.getElementById('abFreqTypeB').value = bp.optionB.frequencyType === 'daily' ? 'daily' : 'weekly';
    document.getElementById('abMaintB').value = bp.optionB.annualMaintenanceCost || 0;

    runABBattleCalculation();
  }

  function sendCurrentItemToAB(slot) {
    const item = state.currentItem;
    const suffix = slot === 'A' ? 'A' : 'B';
    document.getElementById(`abName${suffix}`).value = `${slot}: ${item.name}`;
    document.getElementById(`abPrice${suffix}`).value = item.price;
    document.getElementById(`abType${suffix}`).value = item.purchaseType;
    document.getElementById(`abYears${suffix}`).value = Math.max(0.5, item.yearsToUse + (item.monthsToUse || 0) / 12);
    document.getElementById(`abResale${suffix}`).value = item.resaleRatePercent || 0;
    document.getElementById(`abTimeSaved${suffix}`).value = item.timeSavedMinutesPerUse || 0;
    document.getElementById(`abMoneySaved${suffix}`).value = item.moneySavedPerUse || 0;
    document.getElementById(`abFreqType${suffix}`).value = item.frequencyType === 'daily' ? 'daily' : 'weekly';
    document.getElementById(`abMaint${suffix}`).value = item.annualMaintenanceCost || 0;

    switchTab('tab-battle');
    showToast(`⚔️「${item.name}」をA/B比較バトルの【${slot}案】にセットしました！`);
  }

  function runABBattleCalculation() {
    const compareYears = Number(document.getElementById('abCompareYears').value) || 5;
    const freqTypeA = document.getElementById('abFreqTypeA').value;
    const freqTypeB = document.getElementById('abFreqTypeB').value;

    const optA = {
      name: document.getElementById('abNameA').value,
      price: Number(document.getElementById('abPriceA').value) || 0,
      purchaseType: document.getElementById('abTypeA').value,
      yearsToUse: Number(document.getElementById('abYearsA').value) || 2,
      resaleRatePercent: Number(document.getElementById('abResaleA').value) || 0,
      timeSavedMinutesPerUse: Number(document.getElementById('abTimeSavedA').value) || 0,
      moneySavedPerUse: Number(document.getElementById('abMoneySavedA').value) || 0,
      annualMaintenanceCost: Number(document.getElementById('abMaintA').value) || 0,
      frequencyType: freqTypeA,
      frequencyCount: freqTypeA === 'daily' ? 1 : 5,
      minutesPerUse: 120,
      satisfactionScore: 3
    };
    const optB = {
      name: document.getElementById('abNameB').value,
      price: Number(document.getElementById('abPriceB').value) || 0,
      purchaseType: document.getElementById('abTypeB').value,
      yearsToUse: Number(document.getElementById('abYearsB').value) || 5,
      resaleRatePercent: Number(document.getElementById('abResaleB').value) || 0,
      timeSavedMinutesPerUse: Number(document.getElementById('abTimeSavedB').value) || 0,
      moneySavedPerUse: Number(document.getElementById('abMoneySavedB').value) || 0,
      annualMaintenanceCost: Number(document.getElementById('abMaintB').value) || 0,
      frequencyType: freqTypeB,
      frequencyCount: freqTypeB === 'daily' ? 1 : 5,
      minutesPerUse: 120,
      satisfactionScore: 5
    };

    const res = Engine.compareTwoOptions(optA, optB, state.userProfile, compareYears);
    state.lastBattleResult = res;

    const winnerName = res.winner === 'A' ? 'A案' : 'B案';
    const crossText = res.crossoverMonth
      ? `${res.crossoverMonth}ヶ月目（約${(res.crossoverMonth / 12).toFixed(1)}年）に「${winnerName}」が逆転し、`
      : `${compareYears}年間を通して一貫して「${winnerName}」が有利で、`;

    document.getElementById('abWinnerHeadline').textContent =
      `🏆 結論：${crossText}${compareYears}年トータルで ${res.costDifference.toLocaleString()}円 お得になります！`;
    document.getElementById('abWinnerSubline').innerHTML =
      `あなたの真の実効時給で換算すると、${winnerName}を選ぶだけで <strong>約 ${res.workHoursDifference} 時間分（約 ${(res.workHoursDifference / 8).toFixed(1)} 営業日分）の労働</strong> が浮く計算です。`;

    document.getElementById('abRankBadgeA').textContent = `Rank ${res.optionA.evaluation.rank} (${res.optionA.evaluation.score}点)`;
    document.getElementById('abRankBadgeB').textContent = `Rank ${res.optionB.evaluation.rank} (${res.optionB.evaluation.score}点)`;

    const finalA = res.monthlySeries[res.monthlySeries.length - 1].cumulativeNetCostA;
    const finalB = res.monthlySeries[res.monthlySeries.length - 1].cumulativeNetCostB;
    document.getElementById('abSummaryBoxA').innerHTML =
      `<span>1日実質: ${res.optionA.unitCosts.costPerDay}円</span><strong>${compareYears}年累積実質コスト: ${finalA.toLocaleString()}円</strong>`;
    document.getElementById('abSummaryBoxB').innerHTML =
      `<span>1日実質: ${res.optionB.unitCosts.costPerDay}円</span><strong>${compareYears}年累積実質コスト: ${finalB.toLocaleString()}円</strong>`;

    Visuals.renderABComparisonChart(
      document.getElementById('abChartCanvas'),
      res,
      state.theme === 'dark'
    );
  }

  // --- TAB 3: サブスク一括断捨離仕分けスタジオ ---
  function renderSubscriptionsStudioTab() {
    const audit = Engine.auditSubscriptionsPortfolio(state.subPortfolio, state.userProfile);
    state.lastSubAudit = audit;

    document.getElementById('subTotalMonthly').textContent = audit.totalMonthly.toLocaleString();
    document.getElementById('subTotalAnnualText').textContent =
      `年間 ${audit.totalAnnual.toLocaleString()} 円（労働 ${audit.totalWorkHoursPerYear} 時間分）`;
    document.getElementById('subSavableAnnual').textContent = audit.savableAnnual.toLocaleString();
    document.getElementById('subSavableWorkText').textContent =
      `即解約推奨(${audit.immediateCutCount}件)を止めるだけで年間 ${audit.savableWorkHoursPerYear} 時間の労働から解放！`;
    document.getElementById('subSavable10Y').textContent = audit.savableFuture10Y.toLocaleString();

    Visuals.renderSubscriptionBubbleChart(
      document.getElementById('subMatrixCanvas'),
      audit,
      state.theme === 'dark'
    );

    const listEl = document.getElementById('subAuditListContainer');
    listEl.innerHTML = '';

    audit.evaluatedSubs.forEach((sub, idx) => {
      const row = document.createElement('div');
      row.className = `sub-audit-row status-${sub.status} ${sub.active ? '' : 'inactive'}`;
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <input type="checkbox" data-sub-toggle="${idx}" ${sub.active ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--accent-primary); cursor:pointer;">
          <div style="flex:1;">
            <input type="text" data-sub-name="${idx}" class="text-input" value="${sub.name}" style="padding:5px 8px; font-size:0.86rem;">
            <div style="font-size:0.74rem; color:var(--text-muted); margin-top:3px;">${sub.reason}</div>
          </div>
        </div>
        <div>
          <div class="label-hint">月額料金 (円)</div>
          <input type="number" data-sub-cost="${idx}" class="num-input" value="${sub.monthlyCost}" step="100" style="padding:5px 8px; font-size:0.86rem;">
        </div>
        <div>
          <div class="label-hint">月間利用回数 (回/月)</div>
          <input type="number" data-sub-uses="${idx}" class="num-input" value="${sub.usesPerMonth}" step="0.5" min="0" style="padding:5px 8px; font-size:0.86rem;">
        </div>
        <div>
          <div class="label-hint">満足度 (★1〜5)</div>
          <input type="number" data-sub-sat="${idx}" class="num-input" value="${sub.satisfaction}" min="1" max="5" step="1" style="padding:5px 8px; font-size:0.86rem;">
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800; font-size:0.84rem;">${sub.statusLabel}</div>
          <div style="font-size:0.78rem; color:var(--text-secondary);">
            1回単価: <strong>${sub.costPerUse.toLocaleString()}円</strong> ｜ 年額: ${sub.annualCost.toLocaleString()}円
          </div>
          <div style="font-size:0.73rem; color:var(--accent-emerald);">
            10年積立換算: ${sub.future10Y.toLocaleString()}円
          </div>
        </div>
      `;
      listEl.appendChild(row);
    });

    // イベントバインド
    listEl.querySelectorAll('[data-sub-toggle]').forEach((el) => {
      el.addEventListener('change', () => {
        const i = Number(el.dataset.subToggle);
        state.subPortfolio[i].active = el.checked;
        saveStateToStorage();
        renderSubscriptionsStudioTab();
      });
    });
    listEl.querySelectorAll('[data-sub-name]').forEach((el) => {
      el.addEventListener('change', () => {
        const i = Number(el.dataset.subName);
        state.subPortfolio[i].name = el.value;
        saveStateToStorage();
        renderSubscriptionsStudioTab();
      });
    });
    listEl.querySelectorAll('[data-sub-cost]').forEach((el) => {
      el.addEventListener('change', () => {
        const i = Number(el.dataset.subCost);
        state.subPortfolio[i].monthlyCost = Math.max(0, Number(el.value) || 0);
        saveStateToStorage();
        renderSubscriptionsStudioTab();
      });
    });
    listEl.querySelectorAll('[data-sub-uses]').forEach((el) => {
      el.addEventListener('change', () => {
        const i = Number(el.dataset.subUses);
        state.subPortfolio[i].usesPerMonth = Math.max(0, Number(el.value) || 0);
        saveStateToStorage();
        renderSubscriptionsStudioTab();
      });
    });
    listEl.querySelectorAll('[data-sub-sat]').forEach((el) => {
      el.addEventListener('change', () => {
        const i = Number(el.dataset.subSat);
        state.subPortfolio[i].satisfaction = Math.max(1, Math.min(5, Number(el.value) || 3));
        saveStateToStorage();
        renderSubscriptionsStudioTab();
      });
    });
  }

  // --- TAB 4: 48時間冷却ボックス ＆ 見送り貯金箱タブ ---
  function renderCoolingAndPiggyTab() {
    const wageData = Engine.calculateEffectiveHourlyWage(state.userProfile);
    const skippedItems = state.decisionHistory.filter((h) => h.decision === 'skipped');
    const totalSavedYen = skippedItems.reduce((sum, h) => sum + (Number(h.savedAmount) || 0), 0);
    const savedWorkHours = Number((totalSavedYen / wageData.effectiveHourlyWage).toFixed(1));
    const savedWorkDays = Number((savedWorkHours / (state.userProfile.workHoursPerDay || 8)).toFixed(1));
    const future10Y = Math.round(totalSavedYen * Math.pow(1.05, 10));

    const rankInfo = Presets.getSaverRank(totalSavedYen);

    document.getElementById('piggyTotalYen').textContent = totalSavedYen.toLocaleString();
    document.getElementById('piggySkippedCountText').textContent = `見送りに成功した衝動買い: ${skippedItems.length} 件`;
    document.getElementById('piggySavedWorkHours').textContent = savedWorkHours.toLocaleString();
    document.getElementById('piggySavedWorkDaysText').textContent = `会社で働く必要がなくなった日数: 約 ${savedWorkDays} 営業日分`;
    document.getElementById('piggyFuture10Y').textContent = future10Y.toLocaleString();
    document.getElementById('piggyLevelText').textContent = `Lv.${rankInfo.level}`;
    document.getElementById('piggyRankTitle').textContent = `${rankInfo.icon} ${rankInfo.title}`;
    document.getElementById('piggyRankProgress').style.width = `${rankInfo.progressPercent}%`;
    document.getElementById('piggyNextGoalText').textContent =
      rankInfo.remainingToNext > 0
        ? `次の称号まであと ${rankInfo.remainingToNext.toLocaleString()} 円の見送り！ (${rankInfo.perk})`
        : `最高ランク到達！ ${rankInfo.perk}`;

    const coolingContainer = document.getElementById('coolingListContainer');
    coolingContainer.innerHTML = '';

    if (state.coolingItems.length === 0) {
      coolingContainer.innerHTML = `
        <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.88rem;">
          現在、冷却ボックスに入っているアイテムはありません。<br>
          メイン診断画面で「迷う買い物」があれば<strong>「🧊 48時間冷却ボックスへ入れる」</strong>を押してみましょう！
        </div>
      `;
    } else {
      const now = Date.now();
      state.coolingItems.forEach((item) => {
        const remainingMs = Math.max(0, item.expiresAt - now);
        const isReady = remainingMs === 0;
        const hrs = Math.floor(remainingMs / 3600000);
        const mins = Math.floor((remainingMs % 3600000) / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);

        const timerText = isReady
          ? '✨ 48時間冷却完了！今すぐ冷静に決断できます'
          : `🧊 冷却中 残り ${hrs}時間 ${String(mins).padStart(2, '0')}分 ${String(secs).padStart(2, '0')}秒`;

        const div = document.createElement('div');
        div.className = 'cooling-item-card';
        div.innerHTML = `
          <div>
            <div style="font-weight:800; font-size:0.98rem; margin-bottom:4px;">
              ${item.name} <span class="privacy-pill">Rank ${item.rank} (${item.score}点)</span>
            </div>
            <div style="font-size:0.82rem; color:var(--text-muted);">
              実質負担: <strong>${item.netCost.toLocaleString()}円</strong> （労働時間換算: 約 ${item.workHours} 時間分）
            </div>
          </div>
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
            <span class="timer-pill ${isReady ? 'ready' : ''}" data-cooling-timer="${item.id}">${timerText}</span>
            <button type="button" class="chip-btn" data-reload-cooling="${item.id}" style="padding:7px 10px;">
              🔄 再診断
            </button>
            <button type="button" class="action-btn btn-skip-save" data-skip-id="${item.id}" style="padding:7px 12px; font-size:0.8rem;">
              🐷 見送って貯金箱へ (+${item.netCost.toLocaleString()}円)
            </button>
            <button type="button" class="action-btn btn-buy-decide" data-buy-id="${item.id}" style="padding:7px 12px; font-size:0.8rem;">
              ✅ 納得して買う
            </button>
          </div>
        `;
        coolingContainer.appendChild(div);
      });

      coolingContainer.querySelectorAll('[data-reload-cooling]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const item = state.coolingItems.find((c) => c.id === btn.dataset.reloadCooling);
          if (item && item.itemSnapshot) {
            state.currentItem = { ...state.currentItem, ...item.itemSnapshot };
            syncFormInputsFromState();
            recalculateMainSimulator();
            switchTab('tab-simulator');
            showToast(`🔄「${item.name}」の条件をメイン診断フォームに読み込みました`);
          }
        });
      });
      coolingContainer.querySelectorAll('[data-skip-id]').forEach((btn) => {
        btn.addEventListener('click', () => resolveCoolingItem(btn.dataset.skipId, 'skipped'));
      });
      coolingContainer.querySelectorAll('[data-buy-id]').forEach((btn) => {
        btn.addEventListener('click', () => resolveCoolingItem(btn.dataset.buyId, 'bought'));
      });
    }

    const histContainer = document.getElementById('decisionHistoryContainer');
    histContainer.innerHTML = '';
    if (state.decisionHistory.length === 0) {
      histContainer.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">
          まだ決断履歴がありません。「買わずに見送り貯金箱へ」または「納得して購入」を選ぶとここに記録されます。
        </div>
      `;
    } else {
      state.decisionHistory.slice().reverse().forEach((h) => {
        const isSkipped = h.decision === 'skipped';
        const div = document.createElement('div');
        div.className = 'cooling-item-card';
        const dateStr = new Date(h.decidedAt).toLocaleString('ja-JP', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        div.innerHTML = `
          <div>
            <span class="privacy-pill" style="background:${isSkipped ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}; color:${isSkipped ? 'var(--accent-emerald)' : 'var(--accent-primary)'};">
              ${isSkipped ? '🐷 見送り貯金成功！' : '✅ 納得の買い物'}
            </span>
            <strong style="margin-left:8px;">${h.name}</strong>
            <span style="font-size:0.78rem; color:var(--text-muted); margin-left:8px;">(${dateStr})</span>
          </div>
          <div style="font-weight:800; color:${isSkipped ? 'var(--accent-emerald)' : 'var(--text-secondary)'};">
            ${isSkipped ? `+${Number(h.savedAmount).toLocaleString()}円 節約 (${h.workHours}時間分の労働を防衛)` : `実質 ${Number(h.savedAmount).toLocaleString()}円 (Rank ${h.rank})`}
          </div>
        `;
        histContainer.appendChild(div);
      });
    }

    updateHeaderStatusPills();
  }

  function resolveCoolingItem(id, decision) {
    const idx = state.coolingItems.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const item = state.coolingItems[idx];
    state.coolingItems.splice(idx, 1);

    state.decisionHistory.push({
      id: `hist_${Date.now()}`,
      name: item.name,
      savedAmount: item.netCost,
      workHours: item.workHours,
      rank: item.rank,
      decision,
      decidedAt: Date.now()
    });

    saveStateToStorage();
    renderCoolingAndPiggyTab();

    if (decision === 'skipped') {
      showToast(`🐷「${item.name}」を見送り、貯金箱に +${item.netCost.toLocaleString()}円（労働${item.workHours}時間分）が貯まりました！`);
    } else {
      showToast(`✅「${item.name}」を冷却期間を経て納得購入リストに記録しました！`);
    }
  }

  // --- 実効時給精密診断タブ ---
  function syncWageInputsFromState() {
    const p = state.userProfile;
    document.getElementById('wageModeSelect').value = p.incomeMode || 'monthly';
    document.getElementById('wageMonthlyInput').value = p.monthlyTakeHome;
    document.getElementById('wageAnnualInput').value = p.annualTakeHome;
    document.getElementById('wageDirectInput').value = p.directHourlyWage;
    document.getElementById('wageWorkDays').value = p.workDaysPerMonth;
    document.getElementById('wageWorkHours').value = p.workHoursPerDay;
    document.getElementById('wageOvertime').value = p.overtimeHoursPerMonth;
    document.getElementById('wageCommute').value = p.commuteMinutesPerDay;
    document.getElementById('wageExpenses').value = p.workExpensesPerMonth;
    document.getElementById('wageStress').value = p.stressLevel;

    document.getElementById('wageGroupMonthly').style.display = p.incomeMode === 'monthly' ? 'block' : 'none';
    document.getElementById('wageGroupAnnual').style.display = p.incomeMode === 'annual' ? 'block' : 'none';
    document.getElementById('wageGroupHourly').style.display = p.incomeMode === 'hourly' ? 'block' : 'none';
  }

  function renderWageTab() {
    syncWageInputsFromState();
    const wageData = Engine.calculateEffectiveHourlyWage(state.userProfile);

    document.getElementById('wageNominalDisplay').textContent = `${wageData.nominalHourlyWage.toLocaleString()} 円/時`;
    document.getElementById('wageEffectiveDisplay').textContent = wageData.effectiveHourlyWage.toLocaleString();
    document.getElementById('wagePsychDisplay').textContent = `${wageData.psychologicalHourlyWage.toLocaleString()} 円/時`;
    document.getElementById('wageHiddenDropDisplay').textContent =
      `通勤・残業・仕事自腹経費により、表面上の時給から ${wageData.hiddenCostRatio}% 目減りしています`;
    document.getElementById('wageTotalBoundDisplay').textContent = `${wageData.monthlyTotalBoundHours} 時間/月`;
    document.getElementById('wageCommuteMonthDisplay').textContent =
      `月 ${wageData.commuteHoursPerMonth} 時間（年間 ${Math.round(wageData.commuteHoursPerMonth * 12)} 時間 ＝ 丸 ${(wageData.commuteHoursPerMonth * 12 / 24).toFixed(1)} 日分！）`;
    document.getElementById('wageTableBasis').textContent = wageData.effectiveHourlyWage.toLocaleString();

    const refPrices = [
      { label: 'カフェランチ (1,500円)', price: 1500 },
      { label: '飲み会1回 (5,000円)', price: 5000 },
      { label: '新作ゲーム・服 (10,000円)', price: 10000 },
      { label: 'ワイヤレスイヤホン (35,000円)', price: 35000 },
      { label: '最新スマホ (150,000円)', price: 150000 },
      { label: '海外旅行・家電 (300,000円)', price: 300000 }
    ];

    const tableEl = document.getElementById('wageQuickReferenceTable');
    tableEl.innerHTML = '';
    refPrices.forEach((rp) => {
      const hrs = (rp.price / wageData.effectiveHourlyWage).toFixed(1);
      const days = (rp.price / wageData.effectiveHourlyWage / (state.userProfile.workHoursPerDay || 8)).toFixed(1);
      const div = document.createElement('div');
      div.className = 'preset-card';
      div.style.cursor = 'default';
      div.innerHTML = `
        <div class="preset-card-top">
          <span>${rp.label}</span>
        </div>
        <div style="font-size:1.05rem; font-weight:800; color:var(--accent-rose);">
          拘束 ${hrs} 時間分 （約 ${days} 営業日）
        </div>
      `;
      tableEl.appendChild(div);
    });

    updateHeaderStatusPills();
  }

  // --- イベントリスナー初期化 ---
  function initEventListeners() {
    document.getElementById('themeToggleBtn').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      saveStateToStorage();
      applyTheme();
    });

    document.getElementById('headerWagePill').addEventListener('click', () => switchTab('tab-wage'));
    document.getElementById('jumpToWageBtn').addEventListener('click', () => switchTab('tab-wage'));
    document.getElementById('headerCoolingPill').addEventListener('click', () => switchTab('tab-piggy'));
    document.getElementById('headerPiggyPill').addEventListener('click', () => switchTab('tab-piggy'));

    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // A/B比較へのワンクリック転送ボタン
    document.getElementById('btnSendToABA').addEventListener('click', () => sendCurrentItemToAB('A'));
    document.getElementById('btnSendToABB').addEventListener('click', () => sendCurrentItemToAB('B'));

    // モバイル下部バーから結果領域へスムーズスクロール
    document.getElementById('btnMobileScrollResults').addEventListener('click', () => {
      const target = document.getElementById('mainResultsArea');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });

    document.querySelectorAll('#presetCategoryBar .cat-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        state.selectedCategory = pill.dataset.cat;
        document.querySelectorAll('#presetCategoryBar .cat-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        renderPresetsGrid();
      });
    });

    document.querySelectorAll('[data-purchase-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.currentItem.purchaseType = btn.dataset.purchaseType;
        if (state.currentItem.purchaseType === 'subscription' && state.currentItem.price > 30000) {
          state.currentItem.price = 1980;
        }
        syncFormInputsFromState();
        recalculateMainSimulator();
      });
    });

    const inputPrice = document.getElementById('inputPrice');
    const sliderPrice = document.getElementById('sliderPrice');
    inputPrice.addEventListener('input', () => {
      const val = Math.max(0, Number(inputPrice.value) || 0);
      if (val > Number(sliderPrice.max)) sliderPrice.max = val * 1.2;
      sliderPrice.value = val;
      readFormInputsToState();
      recalculateMainSimulator();
    });
    sliderPrice.addEventListener('input', () => {
      inputPrice.value = sliderPrice.value;
      readFormInputsToState();
      recalculateMainSimulator();
    });

    document.querySelectorAll('[data-set-price]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const p = Number(chip.dataset.setPrice);
        inputPrice.value = p;
        sliderPrice.max = Math.max(300000, p * 1.5);
        sliderPrice.value = p;
        readFormInputsToState();
        recalculateMainSimulator();
      });
    });

    document.querySelectorAll('[data-set-period]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const [y, m] = chip.dataset.setPeriod.split(',').map(Number);
        document.getElementById('inputYears').value = y;
        document.getElementById('inputMonths').value = m;
        readFormInputsToState();
        recalculateMainSimulator();
      });
    });

    document.querySelectorAll('[data-set-resale]').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.getElementById('inputResaleRate').value = Number(chip.dataset.setResale);
        readFormInputsToState();
        recalculateMainSimulator();
      });
    });

    document.querySelectorAll('[data-set-timesaved]').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.getElementById('inputTimeSaved').value = Number(chip.dataset.setTimesaved);
        readFormInputsToState();
        recalculateMainSimulator();
      });
    });

    document.querySelectorAll('#starSelector .star-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.currentItem.satisfactionScore = Number(btn.dataset.star);
        syncFormInputsFromState();
        recalculateMainSimulator();
      });
    });

    [
      'inputItemName',
      'inputBillingCycle',
      'inputYears',
      'inputMonths',
      'inputFreqType',
      'inputFreqCount',
      'inputMinutesPerUse',
      'inputResaleRate',
      'inputTimeSaved',
      'inputMoneySaved',
      'inputMaintenance',
      'inputInvestRate',
      'inputBiasFullPrice',
      'inputBiasCashTest',
      'inputPaymentMethod'
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          readFormInputsToState();
          recalculateMainSimulator();
        });
      }
    });

    document.getElementById('resetFormBtn').addEventListener('click', () => {
      applyPresetToForm(Presets.ITEM_PRESETS[0]);
      showToast('初期プリセットに戻しました');
    });

    // 家族稟議書ジェネレーターのトーン切替・コピー・URL共有
    document.querySelectorAll('[data-pitch-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.pitchMode = btn.dataset.pitchMode;
        document.querySelectorAll('[data-pitch-mode]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (state.lastAnalysis) updateFamilyPitchBox(state.lastAnalysis);
      });
    });

    document.getElementById('btnCopyPitchText').addEventListener('click', () => {
      const txt = document.getElementById('familyPitchTextarea').value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => {
          showToast('💌 LINE・家族相談用プレゼン文をコピーしました！');
        });
      }
    });

    document.getElementById('btnCopyShareUrl').addEventListener('click', () => {
      const query = Engine.encodeItemToQuery(state.currentItem);
      const baseUrl = window.location.href.split('?')[0];
      const fullUrl = `${baseUrl}?${query}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullUrl).then(() => {
          showToast('🔗 この診断設定を100%再現する共有URLをコピーしました！');
        });
      }
    });

    // 3大決断アクションボタン（重複連打ガード＆スナップショット保存付き）
    document.getElementById('btnAddToCooling').addEventListener('click', () => {
      if (!state.lastAnalysis) return;
      const res = state.lastAnalysis;
      state.coolingItems.unshift({
        id: `cool_${Date.now()}`,
        name: res.itemSummary.name,
        netCost: res.itemSummary.netOutOfPocketCost,
        initialPrice: res.itemSummary.initialOutlay,
        workHours: res.laborMetrics.requiredWorkHoursNet,
        rank: res.evaluation.rank,
        score: res.evaluation.score,
        addedAt: Date.now(),
        expiresAt: Date.now() + 48 * 3600 * 1000,
        itemSnapshot: { ...state.currentItem }
      });
      saveStateToStorage();
      updateHeaderStatusPills();
      showToast(`🧊「${res.itemSummary.name}」を48時間冷却ボックスへ登録しました！`);
    });

    document.getElementById('btnSkipAndSave').addEventListener('click', () => {
      if (!state.lastAnalysis) return;
      const res = state.lastAnalysis;
      const sig = `skip_${res.itemSummary.name}_${res.itemSummary.netOutOfPocketCost}`;
      if (state.lastRecordedSignature === sig && Date.now() - state.lastRecordedTime < 6000) {
        showToast('⚠️ 同じアイテムが直前に貯金箱へ記録済みです');
        return;
      }
      state.lastRecordedSignature = sig;
      state.lastRecordedTime = Date.now();

      state.decisionHistory.push({
        id: `hist_${Date.now()}`,
        name: res.itemSummary.name,
        savedAmount: res.itemSummary.netOutOfPocketCost,
        workHours: res.laborMetrics.requiredWorkHoursNet,
        rank: res.evaluation.rank,
        decision: 'skipped',
        decidedAt: Date.now()
      });
      saveStateToStorage();
      updateHeaderStatusPills();
      showToast(`🐷 ナイス判断！見送り貯金箱に +${res.itemSummary.netOutOfPocketCost.toLocaleString()}円（労働${res.laborMetrics.requiredWorkHoursNet}時間分）が貯まりました！`);
    });

    document.getElementById('btnRecordBuy').addEventListener('click', () => {
      if (!state.lastAnalysis) return;
      const res = state.lastAnalysis;
      state.decisionHistory.push({
        id: `hist_${Date.now()}`,
        name: res.itemSummary.name,
        savedAmount: res.itemSummary.netOutOfPocketCost,
        workHours: res.laborMetrics.requiredWorkHoursNet,
        rank: res.evaluation.rank,
        decision: 'bought',
        decidedAt: Date.now()
      });
      saveStateToStorage();
      updateHeaderStatusPills();
      showToast(`✅「${res.itemSummary.name}」を納得の買い物リストへ記録しました！`);
    });

    // A/B バトル入力監視
    [
      'abCompareYears',
      'abNameA', 'abPriceA', 'abTypeA', 'abYearsA', 'abResaleA', 'abTimeSavedA', 'abMoneySavedA', 'abFreqTypeA', 'abMaintA',
      'abNameB', 'abPriceB', 'abTypeB', 'abYearsB', 'abResaleB', 'abTimeSavedB', 'abMoneySavedB', 'abFreqTypeB', 'abMaintB'
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => runABBattleCalculation());
      }
    });

    // サブスクスタジオ：行追加＆一括貯金箱計上
    document.getElementById('btnAddCustomSub').addEventListener('click', () => {
      state.subPortfolio.push({
        id: `sub_custom_${Date.now()}`,
        name: '追加したサブスク・固定費',
        icon: '✨',
        active: true,
        monthlyCost: 1200,
        usesPerMonth: 2,
        minutesPerUse: 30,
        satisfaction: 2
      });
      saveStateToStorage();
      renderSubscriptionsStudioTab();
      showToast('＋ 新しいサブスク行を追加しました');
    });

    document.getElementById('btnBulkSaveSubs').addEventListener('click', () => {
      if (!state.lastSubAudit) return;
      const cutSubs = state.lastSubAudit.evaluatedSubs.filter((s) => s.active && s.status === 'cut_immediately');
      if (cutSubs.length === 0) {
        showToast('現在、即解約推奨（赤判定）の有効なサブスクはありません');
        return;
      }
      let totalAnnualSaved = 0;
      let totalWorkHours = 0;
      const wage = Engine.calculateEffectiveHourlyWage(state.userProfile).effectiveHourlyWage;

      cutSubs.forEach((s) => {
        const target = state.subPortfolio.find((p) => p.id === s.id);
        if (target) target.active = false;
        totalAnnualSaved += s.annualCost;
        const wh = Number((s.annualCost / wage).toFixed(1));
        totalWorkHours += wh;
        state.decisionHistory.push({
          id: `hist_${Date.now()}_${s.id}`,
          name: `【サブスク解約1年分】${s.name}`,
          savedAmount: s.annualCost,
          workHours: wh,
          rank: 'D',
          decision: 'skipped',
          decidedAt: Date.now()
        });
      });

      saveStateToStorage();
      renderSubscriptionsStudioTab();
      updateHeaderStatusPills();
      showToast(`✂️ 不要サブスク${cutSubs.length}件を仕分けし、1年分 +${totalAnnualSaved.toLocaleString()}円 を見送り貯金箱へ計上しました！`);
    });

    // 冷却ボックス48時間早送りデモ
    document.getElementById('btnFastForwardCooling').addEventListener('click', () => {
      state.coolingItems.forEach((item) => {
        item.expiresAt = Date.now() - 1000;
      });
      saveStateToStorage();
      renderCoolingAndPiggyTab();
      showToast('⏩ デモ機能：すべての冷却中アイテムを「48時間経過（冷却完了）」状態にしました！');
    });

    document.getElementById('btnClearHistory').addEventListener('click', () => {
      state.decisionHistory = [];
      saveStateToStorage();
      renderCoolingAndPiggyTab();
      showToast('決断履歴をリセットしました');
    });

    document.getElementById('btnExportData').addEventListener('click', () => {
      const dataStr = JSON.stringify({
        exportedAt: new Date().toISOString(),
        userProfile: state.userProfile,
        subPortfolio: state.subPortfolio,
        coolingItems: state.coolingItems,
        decisionHistory: state.decisionHistory
      }, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `valuelens_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('📥 データのJSONバックアップを保存しました');
    });

    // 実効時給タブ
    [
      'wageModeSelect',
      'wageMonthlyInput',
      'wageAnnualInput',
      'wageDirectInput',
      'wageWorkDays',
      'wageWorkHours',
      'wageOvertime',
      'wageCommute',
      'wageExpenses',
      'wageStress'
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          state.userProfile.incomeMode = document.getElementById('wageModeSelect').value;
          state.userProfile.monthlyTakeHome = Number(document.getElementById('wageMonthlyInput').value) || 0;
          state.userProfile.annualTakeHome = Number(document.getElementById('wageAnnualInput').value) || 0;
          state.userProfile.directHourlyWage = Number(document.getElementById('wageDirectInput').value) || 1000;
          state.userProfile.workDaysPerMonth = Number(document.getElementById('wageWorkDays').value) || 20;
          state.userProfile.workHoursPerDay = Number(document.getElementById('wageWorkHours').value) || 8;
          state.userProfile.overtimeHoursPerMonth = Number(document.getElementById('wageOvertime').value) || 0;
          state.userProfile.commuteMinutesPerDay = Number(document.getElementById('wageCommute').value) || 0;
          state.userProfile.workExpensesPerMonth = Number(document.getElementById('wageExpenses').value) || 0;
          state.userProfile.stressLevel = Number(document.getElementById('wageStress').value) || 3;

          saveStateToStorage();
          renderWageTab();
          recalculateMainSimulator();
        });
      }
    });

    document.querySelectorAll('[data-set-income]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const val = Number(chip.dataset.setIncome);
        document.getElementById('wageMonthlyInput').value = val;
        state.userProfile.monthlyTakeHome = val;
        saveStateToStorage();
        renderWageTab();
        recalculateMainSimulator();
      });
    });

    // SNSシェアモーダル + Escapeキー対応
    const shareModal = document.getElementById('shareModalBackdrop');
    document.getElementById('btnOpenShareModal').addEventListener('click', () => {
      if (!state.lastAnalysis) return;
      shareModal.classList.add('open');
      Visuals.renderShareCardCanvas(document.getElementById('shareCardCanvas'), state.lastAnalysis);
    });
    document.getElementById('btnCloseShareModal').addEventListener('click', () => {
      shareModal.classList.remove('open');
    });
    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) shareModal.classList.remove('open');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && shareModal.classList.contains('open')) {
        shareModal.classList.remove('open');
      }
    });

    document.getElementById('btnDownloadSharePng').addEventListener('click', () => {
      const canvas = document.getElementById('shareCardCanvas');
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `valuelens_${(state.currentItem.name || 'card').slice(0, 15)}.png`;
      a.click();
      showToast('💾 診断書カード画像（PNG）を保存しました！');
    });

    document.getElementById('btnCopyShareText').addEventListener('click', () => {
      if (!state.lastAnalysis) return;
      const r = state.lastAnalysis;
      const text = [
        `💎【ValueLens 買い物実質価値診断】`,
        `対象: ${r.itemSummary.name}`,
        `判定: RANK ${r.evaluation.rank} (${r.evaluation.score}点) — ${r.evaluation.badgeText}`,
        `・実質純負担: ${r.itemSummary.netOutOfPocketCost.toLocaleString()}円 (売却予想 -${r.itemSummary.resaleValue.toLocaleString()}円反映)`,
        `・1日あたり: ${r.unitCosts.costPerDay}円 (${r.unitCosts.dailyBenchmark.primaryText})`,
        `・必要労働時間: ${r.laborMetrics.requiredWorkHoursNet}時間 (約${r.laborMetrics.requiredWorkDaysNet}営業日分)`,
        `・買わずに10年投資(年利5%)した場合: ${(r.opportunityCost.projections[10]?.futureValue || 0).toLocaleString()}円`,
        `#ValueLens #実質価値シミュレーター #買わなかった貯金箱`
      ].join('\n');

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showToast('📋 診断結果テキストをクリップボードにコピーしました！');
        });
      }
    });

    window.addEventListener('resize', () => {
      if (state.activeTab === 'tab-simulator' && state.lastAnalysis) {
        Visuals.renderOpportunityChart(
          document.getElementById('opportunityChartCanvas'),
          state.lastAnalysis,
          state.theme === 'dark'
        );
      } else if (state.activeTab === 'tab-battle' && state.lastBattleResult) {
        Visuals.renderABComparisonChart(
          document.getElementById('abChartCanvas'),
          state.lastBattleResult,
          state.theme === 'dark'
        );
      } else if (state.activeTab === 'tab-subs' && state.lastSubAudit) {
        Visuals.renderSubscriptionBubbleChart(
          document.getElementById('subMatrixCanvas'),
          state.lastSubAudit,
          state.theme === 'dark'
        );
      }
    });

    setInterval(() => {
      if (state.activeTab === 'tab-piggy' && state.coolingItems.length > 0) {
        const now = Date.now();
        state.coolingItems.forEach((item) => {
          const badge = document.querySelector(`[data-cooling-timer="${item.id}"]`);
          if (!badge) return;
          const remainingMs = Math.max(0, item.expiresAt - now);
          if (remainingMs === 0) {
            badge.className = 'timer-pill ready';
            badge.textContent = '✨ 48時間冷却完了！今すぐ冷静に決断できます';
          } else {
            const hrs = Math.floor(remainingMs / 3600000);
            const mins = Math.floor((remainingMs % 3600000) / 60000);
            const secs = Math.floor((remainingMs % 60000) / 1000);
            badge.textContent = `🧊 冷却中 残り ${hrs}時間 ${String(mins).padStart(2, '0')}分 ${String(secs).padStart(2, '0')}秒`;
          }
        });
      }
    }, 1000);
  }

  function init() {
    loadStateFromStorage();
    applyTheme();
    renderPresetsGrid();
    renderABBattlePresets();
    syncFormInputsFromState();
    syncWageInputsFromState();
    initEventListeners();
    recalculateMainSimulator();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
