
Pages.breakdown = function () {
  const data = App.state.filteredData;
  const m = App.state.mapping;
  const sc2 = App.state.schema;

  if (!m.group) {
    document.getElementById('page-content').innerHTML = `<div class="loading-state"><span>No group column was mapped for this dataset.</span></div>`;
    return;
  }

  const GROUPS = [...new Set(App.state.rawData.map(r => r.__group))].sort();
  const CATS   = m.category ? [...new Set(App.state.rawData.map(r => r.__category))].sort() : [];

  /* Group comparison */
  const groupCompare = DataUtils.groupBy(data, '__group');
  const groupOrdered = GROUPS.map(g => ({ label:g, total: (groupCompare.find(x=>x.label===g)||{total:0}).total }));

  /* Category mix per group */
  let categoryMix = [];
  if (CATS.length) {
    const mixMap = new Map();
    GROUPS.forEach(g => { const o = { label:g }; CATS.forEach(c => o[c]=0); mixMap.set(g,o); });
    data.forEach(r => { const e = mixMap.get(r.__group); if (e && r.__category in e) e[r.__category] += r.__value; });
    categoryMix = [...mixMap.values()];
  }

  /* Trend per group */
  let trendData = [];
  if (m.date) {
    const trendMap = new Map();
    data.forEach(r => {
      const mo = DataUtils.fmt(r.__date,'MMM yy');
      if (!trendMap.has(mo)) { const o = { Month:mo }; GROUPS.forEach(g => o[g]=0); trendMap.set(mo,o); }
      trendMap.get(mo)[r.__group] += r.__value;
    });
    trendData = DataUtils.sortMonthEntries([...trendMap.values()], x=>x.Month);
  }

  /* Breakdown table */
  const breakdown = (() => {
    const map = new Map();
    GROUPS.forEach(g => map.set(g, { label:g, count:0, total:0, entities:{} }));
    data.forEach(r => {
      const e = map.get(r.__group); if (!e) return;
      e.count++; e.total += r.__value;
      const entKey = m.entity ? r.__entity : (m.category ? r.__category : null);
      if (entKey) e.entities[entKey] = (e.entities[entKey]||0) + r.__value;
    });
    return GROUPS.map(g => {
      const e = map.get(g);
      const top = Object.entries(e.entities).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
      return { label:g, count:e.count, total:e.total, avg: e.count ? e.total/e.count : 0, top };
    }).sort((a,b) => b.total - a.total);
  })();

  document.getElementById('page-content').innerHTML = `
<div class="page-inner space-y-6">
  <div class="grid-2">
    <div class="card">
      <div class="card-header"><div class="card-title">${sc2.groupLabel} Comparison</div></div>
      <div class="card-body"><div class="chart-container"><canvas id="chart-grp-compare"></canvas></div></div>
    </div>
    ${categoryMix.length ? `
    <div class="card">
      <div class="card-header"><div class="card-title">${sc2.categoryLabel} Mix per ${sc2.groupLabel}</div></div>
      <div class="card-body"><div class="chart-container"><canvas id="chart-cat-mix"></canvas></div></div>
    </div>` : `<div class="card"><div class="card-body"><div class="text-muted">Map a Category column to see composition per ${sc2.groupLabel}.</div></div></div>`}
  </div>

  ${trendData.length ? `
  <div class="card">
    <div class="card-header"><div class="card-title">${sc2.groupLabel} Trend Over Time</div></div>
    <div class="card-body"><div class="chart-container" style="height:350px"><canvas id="chart-grp-trend"></canvas></div></div>
  </div>` : ''}

  <div class="card">
    <div class="card-header"><div class="card-title">${sc2.groupLabel} Performance Breakdown</div></div>
    <div class="card-body p0">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="pl6">${sc2.groupLabel}</th>
              <th class="right">Records</th>
              <th class="right">Total ${sc2.valueLabel}</th>
              <th class="right">Avg ${sc2.valueLabel}</th>
              <th class="right pl6">Top ${m.entity ? sc2.entityLabel : sc2.categoryLabel}</th>
            </tr>
          </thead>
          <tbody>
            ${breakdown.map(row => `
            <tr>
              <td class="pl6">
                <div class="region-pin-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span style="font-weight:600">${row.label}</span>
                </div>
              </td>
              <td class="right">${row.count.toLocaleString()}</td>
              <td class="right bold">${App.formatValue(row.total)}</td>
              <td class="right muted">${App.formatValue(row.avg)}</td>
              <td class="right pl6"><span class="badge">${row.top}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>`;

  const scales = App.commonScales();
  const tt = App.commonTooltip();
  const lc = App.chartDefaults().labelColor;

  App.createChart('chart-grp-compare', {
    type: 'bar',
    data: { labels: groupOrdered.map(d => d.label), datasets: [{ label: sc2.valueLabel, data: groupOrdered.map(d => d.total), backgroundColor: CHART_COLORS, borderRadius: 6, borderSkipped: false }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ ...tt, callbacks:{label:ctx=>App.formatValue(ctx.raw)} } }, scales }
  });

  if (categoryMix.length) {
    App.createChart('chart-cat-mix', {
      type: 'bar',
      data: { labels: categoryMix.map(d => d.label), datasets: CATS.map((cat,i) => ({ label: cat, data: categoryMix.map(d => d[cat]), backgroundColor: CHART_COLORS[i % CHART_COLORS.length], borderRadius: i===CATS.length-1?6:0, borderSkipped:false })) },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:lc } }, tooltip:{ ...tt, callbacks:{label:ctx=>App.formatValue(ctx.raw)} } }, scales:{ ...scales, x:{...scales.x, stacked:true}, y:{...scales.y, stacked:true} } }
    });
  }

  if (trendData.length) {
    App.createChart('chart-grp-trend', {
      type: 'line',
      data: { labels: trendData.map(d => d.Month), datasets: GROUPS.map((g,i) => ({ label:g, data: trendData.map(d => d[g]), borderColor: CHART_COLORS[i % CHART_COLORS.length], backgroundColor:'transparent', borderWidth:3, pointRadius:0, pointHoverRadius:5, tension:0.3 })) },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:lc } }, tooltip:{ ...tt, callbacks:{label:ctx=>App.formatValue(ctx.raw)} } }, scales }
    });
  }
};
