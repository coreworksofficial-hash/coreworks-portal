/**
 * ValueLens (バリューレンズ) - High-DPI Canvas Charts, Interactive Crosshairs & SNS Share Card Generator
 * Zero external dependencies / 100% Offline & Privacy-Safe Canvas Rendering
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ValueLensVisuals = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * 角丸長方形を描画するCanvasヘルパー
   */
  function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  /**
   * Canvas上で指定幅を超える文字列を安全に省略（...）するヘルパー
   */
  function fitTextToWidth(ctx, text, maxWidth) {
    const str = String(text || '');
    if (!ctx || typeof ctx.measureText !== 'function') return str;
    if (ctx.measureText(str).width <= maxWidth) return str;
    let len = str.length;
    while (len > 1 && ctx.measureText(str.slice(0, len) + '…').width > maxWidth) {
      len--;
    }
    return str.slice(0, len) + '…';
  }

  /**
   * 金額を短縮表記（例: 12.5万円 / 3,500円）にフォーマット
   */
  function formatCompactYen(amount) {
    const num = Math.round(Number(amount) || 0);
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 100000000) {
      return `${sign}${(abs / 100000000).toFixed(2)}億円`;
    }
    if (abs >= 10000) {
      const man = abs / 10000;
      return `${sign}${man >= 100 ? Math.round(man).toLocaleString() : man.toFixed(1).replace(/\.0$/, '')}万円`;
    }
    return `${sign}${abs.toLocaleString()}円`;
  }

  /**
   * 1. 複利機会費用チャート（もし買わずに投資していたら 0〜20年推移 ＋ ホバークロスヘア対応）
   */
  function renderOpportunityChart(canvas, analysisResult, isDark = true, hoverYear = null) {
    if (!canvas || !canvas.getContext) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || 560);
    const height = Math.max(220, rect.height || 250);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const bg = isDark ? '#0f172a' : '#f8fafc';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(100, 116, 139, 0.16)';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const textMain = isDark ? '#f1f5f9' : '#0f172a';
    const accentInvest = '#10b981';
    const accentPrincipal = '#6366f1';

    ctx.fillStyle = bg;
    drawRoundedRect(ctx, 0, 0, width, height, 12);
    ctx.fill();

    const timeline = (analysisResult && analysisResult.opportunityCost && analysisResult.opportunityCost.timeline) || [];
    if (!timeline.length) return;

    const padLeft = 68;
    const padRight = 24;
    const padTop = 34;
    const padBottom = 38;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const maxVal = Math.max(1000, ...timeline.map((d) => d.futureValue)) * 1.08;

    // 横グリッド線
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.font = '11px "Inter", "Hiragino Sans", "Meiryo", sans-serif';
    ctx.fillStyle = textMuted;
    ctx.textAlign = 'right';

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const y = padTop + plotH - ratio * plotH;
      const val = maxVal * ratio;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(formatCompactYen(val), padLeft - 8, y + 4);
    }

    // X軸ラベル
    ctx.textAlign = 'center';
    [0, 5, 10, 15, 20].forEach((yr) => {
      const x = padLeft + (yr / 20) * plotW;
      ctx.fillText(`${yr}年後`, x, height - 12);
    });

    // 元本ラインの描画
    ctx.beginPath();
    timeline.forEach((pt, idx) => {
      const x = padLeft + (pt.year / 20) * plotW;
      const y = padTop + plotH - (pt.principal / maxVal) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = accentPrincipal;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 複利運用ライン＆グラデーション塗りつぶし
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

    ctx.beginPath();
    timeline.forEach((pt, idx) => {
      const x = padLeft + (pt.year / 20) * plotW;
      const y = padTop + plotH - (pt.futureValue / maxVal) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // 複利ライン実線
    ctx.beginPath();
    timeline.forEach((pt, idx) => {
      const x = padLeft + (pt.year / 20) * plotW;
      const y = padTop + plotH - (pt.futureValue / maxVal) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = accentInvest;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 10年後・20年後のドット＆ラベル強調
    [10, 20].forEach((yr) => {
      const pt = timeline.find((d) => d.year === yr);
      if (!pt) return;
      const x = padLeft + (pt.year / 20) * plotW;
      const y = padTop + plotH - (pt.futureValue / maxVal) * plotH;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = accentInvest;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = bg;
      ctx.stroke();

      ctx.fillStyle = textMain;
      ctx.font = 'bold 11px "Inter", "Hiragino Sans", sans-serif';
      ctx.textAlign = yr === 20 ? 'right' : 'center';
      ctx.fillText(`${yr}年後: ${formatCompactYen(pt.futureValue)}`, yr === 20 ? x - 6 : x, Math.max(16, y - 10));
    });

    // インタラクティブ・ホバークロスヘア描画
    if (hoverYear !== null && hoverYear >= 0 && hoverYear <= 20) {
      const pt = timeline.find((d) => d.year === hoverYear);
      if (pt) {
        const hx = padLeft + (pt.year / 20) * plotW;
        const hy = padTop + plotH - (pt.futureValue / maxVal) * plotH;

        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(hx, padTop);
        ctx.lineTo(hx, padTop + plotH);
        ctx.strokeStyle = textMain;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(hx, hy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = accentInvest;
        ctx.stroke();

        // ツールチップボックス
        const tipText = `${pt.year}年後: 資産 ${pt.futureValue.toLocaleString()}円 (運用益 +${pt.gain.toLocaleString()}円)`;
        ctx.font = 'bold 11px "Inter", "Hiragino Sans", sans-serif';
        const tipW = Math.min(width - 20, ctx.measureText(tipText).width + 20);
        const tipX = Math.max(padLeft, Math.min(width - tipW - 10, hx - tipW / 2));
        const tipY = Math.max(24, hy - 36);

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        drawRoundedRect(ctx, tipX, tipY, tipW, 24, 6);
        ctx.fill();
        ctx.strokeStyle = accentInvest;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = textMain;
        ctx.textAlign = 'center';
        ctx.fillText(tipText, tipX + tipW / 2, tipY + 16);
      }
    }

    // 凡例
    ctx.textAlign = 'left';
    ctx.font = '11px "Inter", "Hiragino Sans", sans-serif';
    ctx.fillStyle = accentInvest;
    ctx.fillText(`● 複利運用資産 (年利${analysisResult.opportunityCost.annualRatePercent}%)`, padLeft + 6, 18);
    ctx.fillStyle = accentPrincipal;
    ctx.fillText('--- 支払元本累計 (マウスホバーで詳細表示)', padLeft + 205, 18);

    // ホバーイベントのバインド（初回のみ登録し、最新データを参照）
    canvas._latestOpportunityData = { analysisResult, isDark, padLeft, plotW };
    if (!canvas._hasOpportunityHoverListener) {
      canvas._hasOpportunityHoverListener = true;
      canvas.addEventListener('mousemove', (e) => {
        const meta = canvas._latestOpportunityData;
        if (!meta) return;
        const r = canvas.getBoundingClientRect();
        const relX = e.clientX - r.left - meta.padLeft;
        const yr = Math.round((relX / Math.max(1, meta.plotW)) * 20);
        if (yr >= 0 && yr <= 20) {
          renderOpportunityChart(canvas, meta.analysisResult, meta.isDark, yr);
        }
      });
      canvas.addEventListener('mouseleave', () => {
        const meta = canvas._latestOpportunityData;
        if (!meta) return;
        renderOpportunityChart(canvas, meta.analysisResult, meta.isDark, null);
      });
    }
  }

  /**
   * 2. A/B 比較バトル 累積実質コスト＆損益分岐点チャート（ホバー対応）
   */
  function renderABComparisonChart(canvas, battleResult, isDark = true, hoverMonth = null) {
    if (!canvas || !canvas.getContext || !battleResult) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || 620);
    const height = Math.max(240, rect.height || 270);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const bg = isDark ? '#0f172a' : '#f8fafc';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(100, 116, 139, 0.16)';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const textMain = isDark ? '#f1f5f9' : '#0f172a';
    const colorA = '#f97316';
    const colorB = '#06b6d4';

    ctx.fillStyle = bg;
    drawRoundedRect(ctx, 0, 0, width, height, 12);
    ctx.fill();

    const series = battleResult.monthlySeries || [];
    if (series.length < 2) return;

    const padLeft = 72;
    const padRight = 24;
    const padTop = 36;
    const padBottom = 38;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const allVals = [];
    series.forEach((s) => {
      allVals.push(s.cumulativeNetCostA, s.cumulativeNetCostB);
    });
    const minVal = Math.min(0, ...allVals);
    const maxVal = Math.max(1000, ...allVals) * 1.08;
    const valRange = Math.max(1000, maxVal - minVal);
    const totalMonths = series[series.length - 1].month;

    const toX = (m) => padLeft + (m / totalMonths) * plotW;
    const toY = (v) => padTop + plotH - ((v - minVal) / valRange) * plotH;

    // 横グリッド
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.font = '11px "Inter", "Hiragino Sans", sans-serif';
    ctx.fillStyle = textMuted;
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const v = minVal + (valRange * i) / 4;
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(formatCompactYen(v), padLeft - 8, y + 4);
    }

    // X軸（年・月ラベル）
    ctx.textAlign = 'center';
    const stepMonths = Math.max(6, Math.round(totalMonths / 6 / 6) * 6);
    for (let m = 0; m <= totalMonths; m += stepMonths) {
      const x = toX(m);
      const label = m % 12 === 0 ? `${m / 12}年目` : `${m}ヶ月`;
      ctx.fillText(label, x, height - 12);
    }

    // Aライン描画
    ctx.beginPath();
    series.forEach((pt, idx) => {
      const x = toX(pt.month);
      const y = toY(pt.cumulativeNetCostA);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = colorA;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Bライン描画
    ctx.beginPath();
    series.forEach((pt, idx) => {
      const x = toX(pt.month);
      const y = toY(pt.cumulativeNetCostB);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = colorB;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // 損益分岐点のハイライト表示
    if (battleResult.crossoverMonth) {
      const crossPt = series.find((s) => s.month === battleResult.crossoverMonth);
      if (crossPt) {
        const cx = toX(crossPt.month);
        const cy = toY(crossPt.cumulativeNetCostB);

        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(cx, padTop);
        ctx.lineTo(cx, padTop + plotH);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#eab308';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = bg;
        ctx.stroke();

        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 11px "Inter", "Hiragino Sans", sans-serif';
        ctx.textAlign = cx > width * 0.7 ? 'right' : 'left';
        const offset = cx > width * 0.7 ? -10 : 10;
        ctx.fillText(`⚡ ${crossPt.month}ヶ月目に実質コスト逆転！`, cx + offset, Math.max(padTop + 14, cy - 10));
      }
    }

    // ホバークロスヘア＆比較ツールチップ
    if (hoverMonth !== null && hoverMonth >= 0 && hoverMonth <= totalMonths) {
      const pt = series.find((s) => s.month === hoverMonth);
      if (pt) {
        const hx = toX(pt.month);
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(hx, padTop);
        ctx.lineTo(hx, padTop + plotH);
        ctx.strokeStyle = textMain;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);

        const diff = Math.abs(pt.cumulativeNetCostA - pt.cumulativeNetCostB);
        const better = pt.cumulativeNetCostA <= pt.cumulativeNetCostB ? 'A案' : 'B案';
        const tipText = `${pt.month}ヶ月目: A=${formatCompactYen(pt.cumulativeNetCostA)} / B=${formatCompactYen(pt.cumulativeNetCostB)} (${better}が${formatCompactYen(diff)}お得)`;
        ctx.font = 'bold 11px "Inter", "Hiragino Sans", sans-serif';
        const tipW = Math.min(width - 20, ctx.measureText(tipText).width + 20);
        const tipX = Math.max(padLeft, Math.min(width - tipW - 10, hx - tipW / 2));

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        drawRoundedRect(ctx, tipX, padTop + 4, tipW, 24, 6);
        ctx.fill();
        ctx.strokeStyle = colorB;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = textMain;
        ctx.textAlign = 'center';
        ctx.fillText(tipText, tipX + tipW / 2, padTop + 20);
      }
    }

    // 凡例
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px "Inter", "Hiragino Sans", sans-serif';
    ctx.fillStyle = colorA;
    ctx.fillText('● A案 実質累積負担', padLeft + 6, 20);
    ctx.fillStyle = colorB;
    ctx.fillText('● B案 実質累積負担（時短・リセール反映）', padLeft + 135, 20);

    canvas._latestABData = { battleResult, isDark, padLeft, plotW, totalMonths };
    if (!canvas._hasABHoverListener) {
      canvas._hasABHoverListener = true;
      canvas.addEventListener('mousemove', (e) => {
        const meta = canvas._latestABData;
        if (!meta) return;
        const r = canvas.getBoundingClientRect();
        const relX = e.clientX - r.left - meta.padLeft;
        const m = Math.round((relX / Math.max(1, meta.plotW)) * meta.totalMonths);
        if (m >= 0 && m <= meta.totalMonths) {
          renderABComparisonChart(canvas, meta.battleResult, meta.isDark, m);
        }
      });
      canvas.addEventListener('mouseleave', () => {
        const meta = canvas._latestABData;
        if (!meta) return;
        renderABComparisonChart(canvas, meta.battleResult, meta.isDark, null);
      });
    }
  }

  /**
   * 3. サブスク一括断捨離マトリクス バブルチャート描画
   * 横軸：月間利用回数、縦軸：満足度（★1〜5）、円の大きさ：月額コスト
   */
  function renderSubscriptionBubbleChart(canvas, auditResult, isDark = true) {
    if (!canvas || !canvas.getContext || !auditResult) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || 620);
    const height = Math.max(240, rect.height || 260);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const bg = isDark ? '#0f172a' : '#f8fafc';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const textMain = isDark ? '#f1f5f9' : '#0f172a';

    ctx.fillStyle = bg;
    drawRoundedRect(ctx, 0, 0, width, height, 12);
    ctx.fill();

    const padLeft = 56;
    const padRight = 28;
    const padTop = 32;
    const padBottom = 38;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // ゾーン背景色分け（左上〜左下：赤の解約ゾーン、右上：緑の神サブスクゾーン）
    ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
    ctx.fillRect(padLeft, padTop + plotH * 0.45, plotW * 0.35, plotH * 0.55);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(padLeft + plotW * 0.35, padTop, plotW * 0.65, plotH * 0.55);

    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.2)';
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // ゾーンラベル
    ctx.font = 'bold 11px "Inter", "Hiragino Sans", sans-serif';
    ctx.fillStyle = '#fb7185';
    ctx.textAlign = 'left';
    ctx.fillText('✂️ 即解約ゾーン (低頻度×低満足)', padLeft + 8, padTop + plotH - 10);

    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'right';
    ctx.fillText('👑 継続・神サブスクゾーン (高頻度×高満足)', padLeft + plotW - 10, padTop + 18);

    // 軸ラベル
    ctx.fillStyle = textMuted;
    ctx.font = '11px "Inter", "Hiragino Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('月間利用回数 (回/月) →', padLeft + plotW / 2, height - 10);

    const activeSubs = (auditResult.evaluatedSubs || []).filter((s) => s.active);
    const maxUses = Math.max(15, ...activeSubs.map((s) => s.usesPerMonth)) * 1.1;

    activeSubs.forEach((sub) => {
      const x = padLeft + Math.min(0.95, Math.max(0.05, sub.usesPerMonth / maxUses)) * plotW;
      const y = padTop + plotH - ((sub.satisfaction - 0.5) / 5) * plotH;
      const r = Math.max(10, Math.min(28, Math.sqrt(sub.monthlyCost) * 0.25));

      let color = '#f59e0b';
      if (sub.status === 'keep_god') color = '#10b981';
      else if (sub.status === 'cut_immediately') color = '#f43f5e';

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color + '55';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();

      ctx.fillStyle = textMain;
      ctx.font = 'bold 11px "Inter", "Hiragino Sans", sans-serif';
      ctx.textAlign = 'center';
      const shortName = fitTextToWidth(ctx, `${sub.icon || ''}${sub.name}`, 130);
      ctx.fillText(shortName, x, Math.max(padTop + 12, y - r - 4));
    });
  }

  /**
   * 4. SNSシェア・保存用「買い物価値診断書カード (1200x630px)」Canvas生成
   */
  function renderShareCardCanvas(canvas, analysisResult) {
    if (!canvas || !canvas.getContext || !analysisResult) return;
    const W = 1200;
    const H = 630;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.55, '#111827');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const glowGrad = ctx.createRadialGradient(980, 140, 20, 980, 140, 340);
    glowGrad.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
    glowGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 28, 28, W - 56, H - 56, 24);
    ctx.stroke();

    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 22px "Inter", "Hiragino Sans", "Meiryo", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💎 ValueLens（バリューレンズ）— 買い物の実質価値・時給・未来資産診断書', 64, 78);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px "Inter", "Hiragino Sans", "Meiryo", sans-serif';
    const itemName = fitTextToWidth(ctx, analysisResult.itemSummary.name || '検討中のアイテム', 780);
    ctx.fillText(itemName, 64, 140);

    const { initialOutlay, resaleValue, netOutOfPocketCost, totalYears, totalUses } = analysisResult.itemSummary;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '21px "Inter", "Hiragino Sans", "Meiryo", sans-serif';
    const subSummary = fitTextToWidth(
      ctx,
      `支払総額: ${initialOutlay.toLocaleString()}円 | 想定売却: -${resaleValue.toLocaleString()}円 | 実質負担: ${netOutOfPocketCost.toLocaleString()}円 (${totalYears}年 / 計${totalUses.toLocaleString()}回)`,
      790
    );
    ctx.fillText(subSummary, 64, 184);

    const rankColors = {
      S: { bg: '#059669', border: '#34d399' },
      A: { bg: '#2563eb', border: '#60a5fa' },
      B: { bg: '#d97706', border: '#fbbf24' },
      C: { bg: '#ea580c', border: '#fb923c' },
      D: { bg: '#dc2626', border: '#f87171' }
    };
    const rInfo = rankColors[analysisResult.evaluation.rank] || rankColors.B;

    ctx.fillStyle = rInfo.bg;
    drawRoundedRect(ctx, 880, 62, 256, 118, 20);
    ctx.fill();
    ctx.strokeStyle = rInfo.border;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 46px "Inter", "Hiragino Sans", sans-serif';
    ctx.fillText(`RANK ${analysisResult.evaluation.rank}`, 1008, 122);
    ctx.font = 'bold 20px "Inter", "Hiragino Sans", sans-serif';
    ctx.fillText(`総合スコア ${analysisResult.evaluation.score} / 100点`, 1008, 158);

    const cards = [
      {
        title: '📅 1日あたり / 1回あたりの摩耗コスト',
        mainValue: `1日 ${analysisResult.unitCosts.costPerDay.toLocaleString()}円`,
        subValue: `1回 ${analysisResult.unitCosts.costPerUse.toLocaleString()}円 (${analysisResult.unitCosts.dailyBenchmark.primaryText})`,
        accent: '#38bdf8'
      },
      {
        title: '⏱️ あなたの人生の「必要労働時間」換算',
        mainValue: `${analysisResult.laborMetrics.requiredWorkHoursNet} 時間分の労働`,
        subValue: `約 ${analysisResult.laborMetrics.requiredWorkDaysNet} 営業日分 (実効時給 ${analysisResult.laborMetrics.effectiveHourlyWage.toLocaleString()}円基準)`,
        accent: '#f472b6'
      },
      {
        title: '📈 買わずに10年投資（年利5%）した場合',
        mainValue: `${(analysisResult.opportunityCost.projections[10]?.futureValue || 0).toLocaleString()} 円`,
        subValue: `20年後なら ${(analysisResult.opportunityCost.projections[20]?.futureValue || 0).toLocaleString()}円の未来資産に相当`,
        accent: '#34d399'
      },
      {
        title: '⚡ 時短・節約リターン＆最終経済収支',
        mainValue: analysisResult.returnMetrics.totalBenefitValue > 0
          ? `+${analysisResult.returnMetrics.totalBenefitValue.toLocaleString()} 円相当の恩恵`
          : `時短・節約効果 0円`,
        subValue: analysisResult.itemSummary.economicNetCost <= 0
          ? `🎉 元が取れて約 ${Math.abs(analysisResult.itemSummary.economicNetCost).toLocaleString()}円のプラス収支！`
          : `時短累計: ${analysisResult.returnMetrics.totalTimeSavedHours}時間 / 回収率 ${analysisResult.returnMetrics.paybackRatioPercent}%`,
        accent: '#a78bfa'
      }
    ];

    cards.forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = 64 + col * 544;
      const cy = 220 + row * 155;
      const cw = 520;
      const ch = 136;

      ctx.fillStyle = 'rgba(30, 41, 59, 0.82)';
      drawRoundedRect(ctx, cx, cy, cw, ch, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = c.accent;
      drawRoundedRect(ctx, cx, cy, 8, ch, 4);
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 18px "Inter", "Hiragino Sans", sans-serif';
      ctx.fillText(fitTextToWidth(ctx, c.title, cw - 36), cx + 24, cy + 36);

      ctx.fillStyle = c.accent;
      ctx.font = 'bold 34px "Inter", "Hiragino Sans", sans-serif';
      ctx.fillText(fitTextToWidth(ctx, c.mainValue, cw - 36), cx + 24, cy + 84);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px "Inter", "Hiragino Sans", sans-serif';
      ctx.fillText(fitTextToWidth(ctx, c.subValue, cw - 36), cx + 24, cy + 116);
    });

    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'left';
    ctx.font = 'bold 19px "Inter", "Hiragino Sans", sans-serif';
    const verdictComment = analysisResult.evaluation.reasons[0] || analysisResult.evaluation.warnings[0] || analysisResult.evaluation.badgeText;
    ctx.fillText(fitTextToWidth(ctx, `💡 AI診断結論: ${verdictComment}`, 760), 64, 568);

    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.font = '15px "Inter", "Hiragino Sans", sans-serif';
    ctx.fillText('#ValueLens #実質価値シミュレーター #買わなかった貯金箱', W - 64, 568);
  }

  return {
    fitTextToWidth,
    formatCompactYen,
    renderOpportunityChart,
    renderABComparisonChart,
    renderSubscriptionBubbleChart,
    renderShareCardCanvas
  };
});
