/**
 * ValueLens (バリューレンズ) - Real-World Presets, A/B Battles & Achievement System
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ValueLensPresets = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * ワンクリックで試せるリアルな買い物プリセット（全18種・カテゴリ別）
   */
  const ITEM_PRESETS = [
    // --- ガジェット・家電 ---
    {
      id: 'iphone_pro',
      category: 'gadget',
      categoryLabel: '📱 ガジェット・時短家電',
      icon: '📱',
      name: '最新ハイエンドスマホ (iPhone等)',
      tagline: '高価だが毎日3時間触り、2年後に高値で売れる代表格',
      purchaseType: 'one_time',
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
      satisfactionScore: 5
    },
    {
      id: 'drum_washer',
      category: 'gadget',
      categoryLabel: '📱 ガジェット・時短家電',
      icon: '🧺',
      name: 'ドラム式洗濯乾燥機',
      tagline: '「洗濯物を干す・取り込む」を人生から消す時短投資の王様',
      purchaseType: 'one_time',
      price: 220000,
      yearsToUse: 7,
      monthsToUse: 0,
      frequencyType: 'daily',
      frequencyCount: 1,
      minutesPerUse: 15,
      resaleRatePercent: 10,
      annualMaintenanceCost: 6000,
      timeSavedMinutesPerUse: 25,
      moneySavedPerUse: 0,
      satisfactionScore: 5
    },
    {
      id: 'robot_vacuum',
      category: 'gadget',
      categoryLabel: '📱 ガジェット・時短家電',
      icon: '🤖',
      name: '水拭き対応ロボット掃除機',
      tagline: '週5回の掃除機がけを自動化し、床に物を置かない習慣も手に入る',
      purchaseType: 'one_time',
      price: 89800,
      yearsToUse: 5,
      monthsToUse: 0,
      frequencyType: 'weekly',
      frequencyCount: 5,
      minutesPerUse: 45,
      resaleRatePercent: 12,
      annualMaintenanceCost: 4000,
      timeSavedMinutesPerUse: 20,
      moneySavedPerUse: 0,
      satisfactionScore: 4
    },
    {
      id: 'VR_headset',
      category: 'gadget',
      categoryLabel: '📱 ガジェット・時短家電',
      icon: '🥽',
      name: '最新VRヘッドセット（衝動買い）',
      tagline: '最初の1ヶ月だけ熱中して箱にしまわれがちな要注意ガジェット例',
      purchaseType: 'one_time',
      price: 74800,
      yearsToUse: 2,
      monthsToUse: 0,
      frequencyType: 'monthly',
      frequencyCount: 1.5,
      minutesPerUse: 45,
      resaleRatePercent: 35,
      annualMaintenanceCost: 0,
      timeSavedMinutesPerUse: 0,
      moneySavedPerUse: 0,
      satisfactionScore: 2
    },

    // --- 仕事・健康・家具 ---
    {
      id: 'ergo_chair',
      category: 'work_health',
      categoryLabel: '🪑 仕事・健康・自己投資',
      icon: '🪑',
      name: '高級オフィスチェア (12万円クラス)',
      tagline: '在宅ワークで毎日8時間座り、腰痛・整体代も減らせる長期資産',
      purchaseType: 'one_time',
      price: 128000,
      yearsToUse: 8,
      monthsToUse: 0,
      frequencyType: 'weekly',
      frequencyCount: 5,
      minutesPerUse: 480,
      resaleRatePercent: 35,
      annualMaintenanceCost: 0,
      timeSavedMinutesPerUse: 5,
      moneySavedPerUse: 60,
      satisfactionScore: 5
    },
    {
      id: 'mattress_premium',
      category: 'work_health',
      categoryLabel: '🪑 仕事・健康・自己投資',
      icon: '🛏️',
      name: '高反発快眠マットレス',
      tagline: '人生の3分の1（毎日7.5時間）を過ごす、最も1時間単価が下がる買い物',
      purchaseType: 'one_time',
      price: 95000,
      yearsToUse: 8,
      monthsToUse: 0,
      frequencyType: 'daily',
      frequencyCount: 1,
      minutesPerUse: 450,
      resaleRatePercent: 0,
      annualMaintenanceCost: 0,
      timeSavedMinutesPerUse: 10,
      moneySavedPerUse: 0,
      satisfactionScore: 5
    },
    {
      id: 'noise_cancel_headphones',
      category: 'work_health',
      categoryLabel: '🪑 仕事・健康・自己投資',
      icon: '🎧',
      name: 'ノイキャンワイヤレスイヤホン/ヘッドホン',
      tagline: '通勤・カフェ作業のストレスを激減させ集中力を買うアイテム',
      purchaseType: 'one_time',
      price: 42000,
      yearsToUse: 3,
      monthsToUse: 0,
      frequencyType: 'daily',
      frequencyCount: 1,
      minutesPerUse: 90,
      resaleRatePercent: 25,
      annualMaintenanceCost: 0,
      timeSavedMinutesPerUse: 8,
      moneySavedPerUse: 0,
      satisfactionScore: 5
    },

    // --- サブスク・定期固定費 ---
    {
      id: 'video_sub_unused',
      category: 'subscription',
      categoryLabel: '🔄 サブスク・固定費見直し',
      icon: '📺',
      name: '月1本しか見ない動画配信サブスク',
      tagline: '「いつか見るかも」で放置して5年間払い続けるとどうなる？',
      purchaseType: 'subscription',
      billingCycle: 'monthly',
      price: 1490,
      yearsToUse: 3,
      monthsToUse: 0,
      frequencyType: 'monthly',
      frequencyCount: 1,
      minutesPerUse: 110,
      resaleRatePercent: 0,
      annualMaintenanceCost: 0,
      timeSavedMinutesPerUse: 0,
      moneySavedPerUse: 0,
      satisfactionScore: 2
    },
    {
      id: 'ai_pro_sub',
      category: 'subscription',
      categoryLabel: '🔄 サブスク・固定費見直し',
      icon: '🧠',
      name: 'AIアシスタント有料プラン (月額3,000円)',
      tagline: '毎日業務や調べ物で30分の時短になるなら、時給換算で何倍の黒字？',
      purchaseType: 'subscription',
      billingCycle: 'monthly',
      price: 3000,
      yearsToUse: 2,
      monthsToUse: 0,
      frequencyType: 'weekly',
      frequencyCount: 5,
      minutesPerUse: 45,
      resaleRatePercent: 0,
      annualMaintenanceCost: 0,
      timeSavedMinutesPerUse: 30,
      moneySavedPerUse: 0,
      satisfactionScore: 5
    },
    {
      id: 'gym_ghost',
      category: 'subscription',
      categoryLabel: '🔄 サブスク・固定費見直し',
      icon: '🏋️',
      name: '月2回しか行けていない24時間ジム会費',
      tagline: '1回あたりの実質入場料を計算すると、都度払い公営ジムの何倍？',
      purchaseType: 'subscription',
      billingCycle: 'monthly',
      price: 8800,
      yearsToUse: 1,
      monthsToUse: 6,
      frequencyType: 'monthly',
      frequencyCount: 2,
      minutesPerUse: 60,
      resaleRatePercent: 0,
      annualMaintenanceCost: 0,
      timeSavedMinutesPerUse: 0,
      moneySavedPerUse: 0,
      satisfactionScore: 2
    },

    // --- 日常の習慣・ファッション・趣味 ---
    {
      id: 'cafe_habit',
      category: 'lifestyle',
      categoryLabel: '☕ 日常習慣・ファッション',
      icon: '☕',
      name: '毎朝のカフェラテ習慣 (月500円×週5回)',
      tagline: '小さな「ラテマネー」も月1万円。10年積み立て投資したらいくら？',
      purchaseType: 'subscription',
      billingCycle: 'monthly',
      price: 10000,
      yearsToUse: 5,
      monthsToUse: 0,
      frequencyType: 'weekly',
      frequencyCount: 5,
      minutesPerUse: 20,
      resaleRatePercent: 0,
      annualMaintenanceCost: 0,
      timeSavedMinutesPerUse: 0,
      moneySavedPerUse: 0,
      satisfactionScore: 3
    },
    {
      id: 'winter_down_jacket',
      category: 'lifestyle',
      categoryLabel: '☕ 日常習慣・ファッション',
      icon: '🧥',
      name: '定番ブランドの本格ダウンジャケット',
      tagline: '冬の間毎日着られて5年長持ち＆メルカリでも高く売れる優等生',
      purchaseType: 'one_time',
      price: 68000,
      yearsToUse: 5,
      monthsToUse: 0,
      frequencyType: 'yearly',
      frequencyCount: 90,
      minutesPerUse: 120,
      resaleRatePercent: 40,
      annualMaintenanceCost: 2500,
      timeSavedMinutesPerUse: 0,
      moneySavedPerUse: 0,
      satisfactionScore: 4
    },
    {
      id: 'trend_party_dress',
      category: 'lifestyle',
      categoryLabel: '☕ 日常習慣・ファッション',
      icon: '👗',
      name: 'セールで一目惚れした流行の服・靴',
      tagline: '「30%オフだからお得！」と買って年に2回しか着ない典型パターン',
      purchaseType: 'one_time',
      price: 19800,
      yearsToUse: 1,
      monthsToUse: 6,
      frequencyType: 'yearly',
      frequencyCount: 2,
      minutesPerUse: 240,
      resaleRatePercent: 5,
      annualMaintenanceCost: 500,
      timeSavedMinutesPerUse: 0,
      moneySavedPerUse: 0,
      satisfactionScore: 2
    },
    {
      id: 'tumbler_water',
      category: 'lifestyle',
      categoryLabel: '☕ 日常習慣・ファッション',
      icon: '🫗',
      name: '保温マイボトル・水筒（自販機卒業）',
      tagline: '3,500円の投資で毎日自販機160円を節約。何日で元が取れる？',
      purchaseType: 'one_time',
      price: 3500,
      yearsToUse: 3,
      monthsToUse: 0,
      frequencyType: 'weekly',
      frequencyCount: 5,
      minutesPerUse: 30,
      resaleRatePercent: 0,
      annualMaintenanceCost: 500,
      timeSavedMinutesPerUse: 0,
      moneySavedPerUse: 140,
      satisfactionScore: 4
    },
    {
      id: 'ereader_tablet',
      category: 'work_health',
      categoryLabel: '🪑 仕事・健康・自己投資',
      icon: '📖',
      name: '防水・読書専用タブレット (Kindle等)',
      tagline: '入浴中や移動中のスキマ時間を読書に変える、堅実な自己投資',
      purchaseType: 'one_time',
      price: 22980,
      yearsToUse: 3,
      monthsToUse: 0,
      frequencyType: 'weekly',
      frequencyCount: 4,
      minutesPerUse: 45,
      resaleRatePercent: 25,
      annualMaintenanceCost: 0,
      timeSavedMinutesPerUse: 0,
      moneySavedPerUse: 0,
      satisfactionScore: 4
    },
    {
      id: 'weekend_crossbike',
      category: 'lifestyle',
      categoryLabel: '☕ 日常習慣・ファッション',
      icon: '🚲',
      name: '週末サイクリング用クロスバイク',
      tagline: '天気が良い週末に月3回乗る趣味アイテム。48時間考えて納得ならアリ！',
      purchaseType: 'one_time',
      price: 68000,
      yearsToUse: 4,
      monthsToUse: 0,
      frequencyType: 'monthly',
      frequencyCount: 3,
      minutesPerUse: 90,
      resaleRatePercent: 25,
      annualMaintenanceCost: 4000,
      timeSavedMinutesPerUse: 0,
      moneySavedPerUse: 200,
      satisfactionScore: 4
    },
    {
      id: 'luxury_toaster',
      category: 'gadget',
      categoryLabel: '📱 ガジェット・時短家電',
      icon: '🍞',
      name: 'スチーム高級トースター (3万円クラス)',
      tagline: '時短にはならないが、毎朝のトーストの幸福度を上げる嗜好家電',
      purchaseType: 'one_time',
      price: 29700,
      yearsToUse: 4,
      monthsToUse: 0,
      frequencyType: 'weekly',
      frequencyCount: 4,
      minutesPerUse: 10,
      resaleRatePercent: 15,
      annualMaintenanceCost: 0,
      timeSavedMinutesPerUse: 0,
      moneySavedPerUse: 0,
      satisfactionScore: 3
    },
    {
      id: 'camping_gear_set',
      category: 'lifestyle',
      categoryLabel: '☕ 日常習慣・ファッション',
      icon: '⛺',
      name: '年2回だけ使う本格キャンプ道具一式',
      tagline: '所有する喜びはあるが、年2回ならレンタルとどっちが得か迷う例',
      purchaseType: 'one_time',
      price: 88000,
      yearsToUse: 3,
      monthsToUse: 0,
      frequencyType: 'yearly',
      frequencyCount: 2,
      minutesPerUse: 360,
      resaleRatePercent: 30,
      annualMaintenanceCost: 2000,
      timeSavedMinutesPerUse: 0,
      moneySavedPerUse: 0,
      satisfactionScore: 3
    }
  ];

  /**
   * A/B どっち買う？比較バトルのプリセットシナリオ
   */
  const AB_BATTLE_PRESETS = [
    {
      id: 'chair_battle',
      title: '🪑 格安チェア(1.5万円) vs 高級エルゴノミクスチェア(12万円)',
      description: '2年ごとにへたって買い替える格安椅子と、8年使えてリセールが35%残り作業効率も上がる高級椅子、5年・8年スパンでどっちが得？',
      compareYears: 8,
      optionA: {
        name: 'A: 1.5万円の格安メッシュチェア（2年寿命）',
        purchaseType: 'one_time',
        price: 15800,
        yearsToUse: 2,
        monthsToUse: 0,
        frequencyType: 'weekly',
        frequencyCount: 5,
        minutesPerUse: 480,
        resaleRatePercent: 0,
        annualMaintenanceCost: 0,
        timeSavedMinutesPerUse: 0,
        moneySavedPerUse: 0,
        satisfactionScore: 2
      },
      optionB: {
        name: 'B: 12万円の高級オフィスチェア（8年寿命・リセール35%）',
        purchaseType: 'one_time',
        price: 120000,
        yearsToUse: 8,
        monthsToUse: 0,
        frequencyType: 'weekly',
        frequencyCount: 5,
        minutesPerUse: 480,
        resaleRatePercent: 35,
        annualMaintenanceCost: 0,
        timeSavedMinutesPerUse: 6,
        moneySavedPerUse: 50,
        satisfactionScore: 5
      }
    },
    {
      id: 'coffee_battle',
      title: '☕ 毎日コンビニ/カフェラテ購入 vs 全自動コーヒーマシン自宅導入',
      description: '毎営業日250円のコーヒーを買う習慣と、5.5万円の全自動マシン（豆代1杯35円）を自宅に置く場合、何ヶ月目で逆転する？',
      compareYears: 4,
      optionA: {
        name: 'A: 毎営業日カフェ/コンビニ購入（月5,500円）',
        purchaseType: 'subscription',
        billingCycle: 'monthly',
        price: 5500,
        yearsToUse: 4,
        monthsToUse: 0,
        frequencyType: 'weekly',
        frequencyCount: 5,
        minutesPerUse: 15,
        resaleRatePercent: 0,
        annualMaintenanceCost: 0,
        timeSavedMinutesPerUse: 0,
        moneySavedPerUse: 0,
        satisfactionScore: 3
      },
      optionB: {
        name: 'B: 全自動エスプレッソマシン（本体5.5万円＋豆代年9,000円）',
        purchaseType: 'one_time',
        price: 55000,
        yearsToUse: 4,
        monthsToUse: 0,
        frequencyType: 'weekly',
        frequencyCount: 5,
        minutesPerUse: 15,
        resaleRatePercent: 20,
        annualMaintenanceCost: 9000,
        timeSavedMinutesPerUse: 5,
        moneySavedPerUse: 0,
        satisfactionScore: 5
      }
    },
    {
      id: 'phone_battle',
      title: '📱 リセール低い格安スマホ(4.5万円) vs 高リセールiPhone(15万円)',
      description: '2年後にほぼ0円になる格安機と、2年後に60%（9万円）で売却でき毎日サクサク動くフラッグシップ機の実質差額を検証',
      compareYears: 4,
      optionA: {
        name: 'A: エントリースマホ 4.5万円（下取り10%）',
        purchaseType: 'one_time',
        price: 45000,
        yearsToUse: 2,
        monthsToUse: 0,
        frequencyType: 'daily',
        frequencyCount: 1,
        minutesPerUse: 180,
        resaleRatePercent: 10,
        annualMaintenanceCost: 0,
        timeSavedMinutesPerUse: 0,
        moneySavedPerUse: 0,
        satisfactionScore: 3
      },
      optionB: {
        name: 'B: ハイエンドiPhone 15万円（2年後60%売却＋毎日5分時短）',
        purchaseType: 'one_time',
        price: 150000,
        yearsToUse: 2,
        monthsToUse: 0,
        frequencyType: 'daily',
        frequencyCount: 1,
        minutesPerUse: 180,
        resaleRatePercent: 60,
        annualMaintenanceCost: 0,
        timeSavedMinutesPerUse: 5,
        moneySavedPerUse: 0,
        satisfactionScore: 5
      }
    },
    {
      id: 'dishwasher_battle',
      title: '🍽️ 食器を毎日手洗い(初期0円) vs 工事不要タンク式食洗機(4.8万円)',
      description: '手洗いはタダに見えて、実は毎日20分の労働時間と年間約7,000円のガス・水道代が消えている！何ヶ月で食洗機が勝つ？',
      compareYears: 3,
      optionA: {
        name: 'A: 毎日手洗いを継続（水道ガス代 高め・時短0分）',
        purchaseType: 'subscription',
        billingCycle: 'monthly',
        price: 1200,
        yearsToUse: 3,
        monthsToUse: 0,
        frequencyType: 'daily',
        frequencyCount: 1,
        minutesPerUse: 20,
        resaleRatePercent: 0,
        annualMaintenanceCost: 0,
        timeSavedMinutesPerUse: 0,
        moneySavedPerUse: 0,
        satisfactionScore: 2
      },
      optionB: {
        name: 'B: タンク式食洗機 4.8万円（毎日18分時短＋節水）',
        purchaseType: 'one_time',
        price: 48000,
        yearsToUse: 4,
        monthsToUse: 0,
        frequencyType: 'daily',
        frequencyCount: 1,
        minutesPerUse: 5,
        resaleRatePercent: 15,
        annualMaintenanceCost: 4500,
        timeSavedMinutesPerUse: 18,
        moneySavedPerUse: 20,
        satisfactionScore: 5
      }
    }
  ];

  /**
   * 「見送り貯金箱（買わなかった累計資産）」の称号・ランクシステム
   */
  const SAVER_RANKS = [
    { minSaved: 0, level: 1, title: '見習いバリューハンター', icon: '🌱', nextGoal: 5000, perk: '衝動買いを1つ見送って最初の一歩を踏み出そう！' },
    { minSaved: 5000, level: 2, title: '脱・ラテマネー実践者', icon: '☕', nextGoal: 20000, perk: '小さな無駄遣いを自分の自由時間に変え始めています！' },
    { minSaved: 20000, level: 3, title: '冷静沈着な48時間マスター', icon: '🧊', nextGoal: 50000, perk: 'セールや煽り文句に踊らされない判断力が身につきました！' },
    { minSaved: 50000, level: 4, title: '時給換算の賢者', icon: '⏱️', nextGoal: 150000, perk: '自分の労働時間と人生の価値を守るプロフェッショナル！' },
    { minSaved: 150000, level: 5, title: '複利と時間の錬金術師', icon: '💎', nextGoal: 500000, perk: '見送った資金だけで海外旅行や本格投資ができる領域に到達！' },
    { minSaved: 500000, level: 6, title: '伝説の経済的自由人（FIREの卵）', icon: '👑', nextGoal: 1000000, perk: '圧倒的な選球眼！本当に価値あるものにだけお金を使えています。' }
  ];

  function getSaverRank(totalSavedAmount) {
    const amount = Math.max(0, Number(totalSavedAmount) || 0);
    let current = SAVER_RANKS[0];
    for (let i = 0; i < SAVER_RANKS.length; i++) {
      if (amount >= SAVER_RANKS[i].minSaved) {
        current = SAVER_RANKS[i];
      }
    }
    const nextGoal = current.nextGoal;
    const progressPercent = amount >= 1000000
      ? 100
      : Math.min(100, Math.round(((amount - current.minSaved) / Math.max(1, nextGoal - current.minSaved)) * 100));

    return {
      ...current,
      totalSavedAmount: amount,
      progressPercent,
      remainingToNext: Math.max(0, nextGoal - amount)
    };
  }

  /**
   * サブスク一括断捨離仕分けスタジオ用の初期ポートフォリオ（ON/OFF・利用頻度変更可能）
   */
  const DEFAULT_SUBSCRIPTION_PORTFOLIO = [
    {
      id: 'sub_prime',
      name: 'Amazonプライム（配送・動画）',
      icon: '📦',
      active: true,
      monthlyCost: 600,
      usesPerMonth: 12,
      minutesPerUse: 45,
      satisfaction: 5
    },
    {
      id: 'sub_video_a',
      name: '動画配信サービスA（惰性で継続中）',
      icon: '🎬',
      active: true,
      monthlyCost: 1590,
      usesPerMonth: 1,
      minutesPerUse: 90,
      satisfaction: 2
    },
    {
      id: 'sub_music',
      name: '音楽ストリーミング（通勤・作業中）',
      icon: '🎵',
      active: true,
      monthlyCost: 1080,
      usesPerMonth: 22,
      minutesPerUse: 60,
      satisfaction: 5
    },
    {
      id: 'sub_gym_ghost',
      name: '24時間フィットネスジム（幽霊会員ぎみ）',
      icon: '🏋️',
      active: true,
      monthlyCost: 8580,
      usesPerMonth: 1.5,
      minutesPerUse: 60,
      satisfaction: 2
    },
    {
      id: 'sub_ai_pro',
      name: '生成AI 有料Proプラン（仕事・時短）',
      icon: '🧠',
      active: true,
      monthlyCost: 3000,
      usesPerMonth: 20,
      minutesPerUse: 30,
      satisfaction: 5
    },
    {
      id: 'sub_cloud',
      name: 'スマホクラウド容量追加 (2TB)',
      icon: '☁️',
      active: true,
      monthlyCost: 1300,
      usesPerMonth: 4,
      minutesPerUse: 15,
      satisfaction: 3
    },
    {
      id: 'sub_magazine',
      name: '雑誌・ニュース読み放題（最初だけ読んだ）',
      icon: '📰',
      active: true,
      monthlyCost: 980,
      usesPerMonth: 1,
      minutesPerUse: 20,
      satisfaction: 2
    },
    {
      id: 'sub_carrier_diff',
      name: '大手キャリア割高プラン差額（格安SIM比）',
      icon: '📱',
      active: false,
      monthlyCost: 4500,
      usesPerMonth: 1,
      minutesPerUse: 10,
      satisfaction: 1
    }
  ];

  return {
    ITEM_PRESETS,
    AB_BATTLE_PRESETS,
    SAVER_RANKS,
    DEFAULT_SUBSCRIPTION_PORTFOLIO,
    getSaverRank
  };
});
