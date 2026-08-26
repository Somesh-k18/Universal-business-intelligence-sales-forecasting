
Pages.insights = function () {
  const data = App.state.filteredData;
  const m = App.state.mapping;
  const sc2 = App.state.schema;
  const insights = [];

  const icon = (path) => `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${path}</svg>`;
  const ICONS = {
    up:    '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    down:  '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
    star:  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    pin:   '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/>',
    pie:   '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    forecast: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  };

  if (data.length === 0) {
    document.getElementById('page-content').innerHTML = `<div class="loading-state"><span>Not enough data in the current filter to generate insights.</span></div>`;
    return;
  }

  const monthly = m.date ? DataUtils.groupByMonth(data) : [];
  const totalValue = DataUtils.sum(data);

  /* 1. Trend: first half vs second half */
  if (monthly.length >= 2) {
    const mid = Math.ceil(monthly.length / 2);
    const firstHalf = monthly.slice(0, mid).reduce((s,d)=>s+d.Total,0);
    const secondHalf = monthly.slice(mid).reduce((s,d)=>s+d.Total,0);
    if (firstHalf > 0) {
      const pct = ((secondHalf - firstHalf) / firstHalf * 100);
      insights.push({ icon: pct>=0?ICONS.up:ICONS.down, tone: pct>=0?'green':'red',
        text: `${sc2.valueLabel} ${pct>=0?'increased':'decreased'} by ${Math.abs(pct).toFixed(1)}% comparing the first and second half of the selected period.` });
    }
  }

  /* 2. Top category */
  if (m.category) {
    const catData = DataUtils.groupBy(data, '__category').sort((a,b)=>b.total-a.total);
    if (catData.length) {
      const top = catData[0];
      insights.push({ icon: ICONS.star, tone:'purple', text: `${top.label} generated the highest ${sc2.valueLabel.toLowerCase()} at ${App.formatValue(top.total)} (${(top.total/totalValue*100).toFixed(1)}% of total).` });
    }
  }

  /* 3/4. Best & worst group */
  if (m.group) {
    const grpData = DataUtils.groupBy(data, '__group').sort((a,b)=>b.total-a.total);
    if (grpData.length) {
      insights.push({ icon: ICONS.pin, tone:'blue', text: `${grpData[0].label} performed best among ${sc2.groupLabel.toLowerCase()}s, contributing ${App.formatValue(grpData[0].total)}.` });
      if (grpData.length > 1) {
        const worst = grpData[grpData.length-1];
        insights.push({ icon: ICONS.alert, tone:'orange', text: `${worst.label} trails the rest with only ${App.formatValue(worst.total)} — worth investigating.` });
      }
    }
  }

  /* 5. Declining category over time */
  if (m.date && m.category && monthly.length >= 2) {
    const catMonthMap = new Map();
    data.forEach(r => {
      const mo = DataUtils.fmt(r.__date, 'MMM yyyy');
      if (!catMonthMap.has(r.__category)) catMonthMap.set(r.__category, new Map());
      const cm = catMonthMap.get(r.__category);
      cm.set(mo, (cm.get(mo)||0) + r.__value);
    });
    let decliningCat = null, worstDrop = 0;
    catMonthMap.forEach((cm, cat) => {
      const entries = DataUtils.sortMonthEntries([...cm.entries()].map(([Month,Total])=>({Month,Total})), x=>x.Month);
      if (entries.length >= 2) {
        const drop = entries[0].Total > 0 ? (entries[entries.length-1].Total - entries[0].Total) / entries[0].Total : 0;
        if (drop < worstDrop) { worstDrop = drop; decliningCat = cat; }
      }
    });
    if (decliningCat && worstDrop < -0.05) {
      insights.push({ icon: ICONS.down, tone:'red', text: `${decliningCat} is declining, down ${Math.abs(worstDrop*100).toFixed(1)}% from the start to the end of the selected period.` });
    }
  }

  /* 6. Average value change over time */
  if (m.date && monthly.length >= 2) {
    const countByMonth = new Map();
    data.forEach(r => { const mo = DataUtils.fmt(r.__date,'MMM yyyy'); countByMonth.set(mo, (countByMonth.get(mo)||0)+1); });
    const first = monthly[0], last = monthly[monthly.length-1];
    const firstAvg = first.Total / (countByMonth.get(first.Month)||1);
    const lastAvg  = last.Total / (countByMonth.get(last.Month)||1);
    if (firstAvg > 0) {
      const pct = ((lastAvg - firstAvg) / firstAvg * 100);
      insights.push({ icon: pct>=0?ICONS.up:ICONS.down, tone: pct>=0?'green':'red', text: `Average ${sc2.valueLabel.toLowerCase()} per record ${pct>=0?'increased':'decreased'} by ${Math.abs(pct).toFixed(1)}% from ${first.Month} to ${last.Month}.` });
    }
  }

  /* 7. Pareto — top 20% of entities */
  if (m.entity) {
    const entMap = new Map();
    data.forEach(r => entMap.set(r.__entity, (entMap.get(r.__entity)||0) + r.__value));
    const entArr = [...entMap.entries()].map(([label,total])=>({label,total})).sort((a,b)=>b.total-a.total);
    if (entArr.length >= 5) {
      const topN = Math.max(1, Math.ceil(entArr.length * 0.2));
      const topRev = entArr.slice(0, topN).reduce((s,p)=>s+p.total,0);
      insights.push({ icon: ICONS.pie, tone:'purple', text: `The top ${Math.round(topN/entArr.length*100)}% of ${sc2.entityLabel.toLowerCase()}s (${topN} of ${entArr.length}) contribute ${(topRev/totalValue*100).toFixed(1)}% of total ${sc2.valueLabel.toLowerCase()}.` });
    }
  }

  /* 8. Peak quarter */
  if (m.date) {
    const quarterData = DataUtils.groupByQuarter(data).sort((a,b)=>b.Total-a.Total);
    if (quarterData.length) {
      insights.push({ icon: ICONS.calendar, tone:'blue', text: `Peak activity occurred in ${quarterData[0].Quarter}, generating ${App.formatValue(quarterData[0].Total)}.` });
    }
  }

  /* 9. Forecast direction */
  if (m.date && monthly.length >= 2) {
    const { slope } = DataUtils.linearRegression(monthly.map(d=>d.Total));
    insights.push({ icon: ICONS.forecast, tone: slope>=0?'green':'red', text: `Trend analysis predicts ${slope>=0?'continued growth':'a slowdown'} in ${sc2.valueLabel.toLowerCase()} over the coming months based on recent momentum.` });
  }

  if (!insights.length) {
    insights.push({ icon: ICONS.alert, tone:'blue', text: 'Map more columns (Date, Category, Group, or Entity) to unlock richer AI-generated insights for this dataset.' });
  }

  document.getElementById('page-content').innerHTML = `
<div class="page-inner space-y-6 max-w-5xl">
  <div class="h-title">
    <div class="h-title-icon">${icon('<path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3c1.8-1.2 3-3.3 3-5.7a7 7 0 0 0-7-7z"/><line x1="9" y1="21" x2="15" y2="21"/><line x1="10" y1="18" x2="14" y2="18"/>')}</div>
    <div>
      <div class="h-title-text">AI Business Insights</div>
      <div class="h-title-sub">Automatically generated from your current filtered dataset (${data.length.toLocaleString()} records)</div>
    </div>
  </div>
  <div class="insight-grid">
    ${insights.map(i => `
      <div class="insight-card ${i.tone}">
        <div class="insight-card-icon">${icon(i.icon)}</div>
        <div class="insight-card-text">${i.text}</div>
      </div>`).join('')}
  </div>
</div>`;
};
