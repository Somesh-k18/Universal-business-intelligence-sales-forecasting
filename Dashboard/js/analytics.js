
Pages.analytics = function () {
  const data = App.state.filteredData;
  const m = App.state.mapping;
  const sc2 = App.state.schema;

  const bestRecord = data.length ? Math.max(...data.map(r => r.__value)) : 0;

  const entKey = m.entity ? '__entity' : (m.category ? '__category' : null);
  const entMap = new Map();
  if (entKey) data.forEach(r => entMap.set(r[entKey], (entMap.get(r[entKey])||0) + r.__value));
  const bestEntity = entMap.size ? [...entMap.entries()].reduce((a,b)=>a[1]>b[1]?a:b)[0] : '—';

  let bestMonth = '—';
  if (m.date) {
    const monthMap = new Map();
    data.forEach(r => { const mo = DataUtils.fmt(r.__date,'MMM yyyy'); monthMap.set(mo, (monthMap.get(mo)||0)+r.__value); });
    bestMonth = monthMap.size ? [...monthMap.entries()].reduce((a,b)=>a[1]>b[1]?a:b)[0] : '—';
  }

  const monthlyRev = m.date ? (() => {
    const map = new Map();
    data.forEach(r => { const k=DataUtils.fmt(r.__date,'MMM yy'); map.set(k,(map.get(k)||0)+r.__value); });
    return DataUtils.sortMonthEntries([...map.entries()].map(([Month,Total])=>({Month,Total})), x=>x.Month);
  })() : [];

  let yoyData = [], yearsArr = [];
  if (m.date) {
    const yoyMap = new Map(); const years = new Set();
    data.forEach(r => {
      const mo = DataUtils.fmt(r.__date,'MMM'); const y = String(r.__date.getFullYear());
      years.add(y);
      if (!yoyMap.has(mo)) yoyMap.set(mo, { Month: mo });
      yoyMap.get(mo)[y] = (yoyMap.get(mo)[y]||0) + r.__value;
    });
    const MONTHS_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    yoyData = [...yoyMap.values()].sort((a,b)=>MONTHS_ORDER.indexOf(a.Month)-MONTHS_ORDER.indexOf(b.Month));
    yearsArr = [...years].sort();
  }

  const top5 = entKey ? [...entMap.entries()].map(([label,total])=>({label,total})).sort((a,b)=>b.total-a.total).slice(0,5) : [];

  let dowLabels = [], dowValues = [];
  if (m.date) {
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const daySums = new Array(7).fill(0);
    data.forEach(r => { daySums[r.__date.getDay()] += r.__value; });
    dowLabels = [1,2,3,4,5,6,0].map(i => dayNames[i]);
    dowValues = [1,2,3,4,5,6,0].map(i => daySums[i]);
  }

  document.getElementById('page-content').innerHTML = `
<div class="page-inner space-y-6">
  <div class="grid-3">
    <div class="stat-card indigo">
      <div class="stat-card-glow"></div>
      <div>
        <div class="stat-card-label">Highest Single Record</div>
        <div class="stat-card-value">${App.formatValue(bestRecord)}</div>
      </div>
      <div class="stat-card-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
      </div>
    </div>
    <div class="stat-card purple">
      <div class="stat-card-glow"></div>
      <div>
        <div class="stat-card-label">Best Month</div>
        <div class="stat-card-value" style="font-size:1.4rem">${bestMonth}</div>
      </div>
      <div class="stat-card-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div>
    </div>
    <div class="stat-card green">
      <div class="stat-card-glow"></div>
      <div>
        <div class="stat-card-label">Top Performer</div>
        <div class="stat-card-value" style="font-size:1.3rem;word-break:break-word">${bestEntity}</div>
      </div>
      <div class="stat-card-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </div>
    </div>
  </div>

  <div class="grid-2">
    ${monthlyRev.length ? `<div class="card"><div class="card-header"><div class="card-title">Monthly ${App.state.schema.valueLabel} Trend</div></div><div class="card-body"><div class="chart-container"><canvas id="chart-monthly-bar"></canvas></div></div></div>` : ''}
    ${yearsArr.length > 1 ? `<div class="card"><div class="card-header"><div class="card-title">Year-over-Year Comparison</div></div><div class="card-body"><div class="chart-container"><canvas id="chart-yoy"></canvas></div></div></div>` : ''}
    ${top5.length ? `<div class="card"><div class="card-header"><div class="card-title">Top 5 by ${App.state.schema.valueLabel}</div></div><div class="card-body"><div class="chart-container"><canvas id="chart-top5"></canvas></div></div></div>` : ''}
    ${dowLabels.length ? `<div class="card"><div class="card-header"><div class="card-title">Totals by Day of Week</div></div><div class="card-body"><div class="chart-container"><canvas id="chart-dow"></canvas></div></div></div>` : ''}
  </div>
  ${(!monthlyRev.length && !top5.length) ? `<div class="card"><div class="card-body"><div class="text-muted">Map a Date and/or Entity column to unlock deeper analytics here.</div></div></div>` : ''}
</div>`;

  const scales = App.commonScales();
  const tt = App.commonTooltip();
  const lc = App.chartDefaults().labelColor;

  if (monthlyRev.length) {
    App.createChart('chart-monthly-bar', {
      type: 'bar',
      data: { labels: monthlyRev.map(d => d.Month), datasets: [{ label: sc2.valueLabel, data: monthlyRev.map(d=>d.Total), backgroundColor:'#4F46E5', borderRadius:6, borderSkipped:false }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ ...tt, callbacks:{label:ctx=>App.formatValue(ctx.raw)} } }, scales }
    });
  }

  if (yearsArr.length > 1) {
    App.createChart('chart-yoy', {
      type: 'line',
      data: { labels: yoyData.map(d => d.Month), datasets: yearsArr.map((y, i) => ({
        label: y, data: yoyData.map(d => d[y] || null), borderColor: CHART_COLORS[i % CHART_COLORS.length],
        backgroundColor: 'transparent', borderWidth: 3, pointRadius: 3, tension: 0.3
      })) },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:lc } }, tooltip:{ ...tt, callbacks:{label:ctx=>App.formatValue(ctx.raw)} } }, scales }
    });
  }

  if (top5.length) {
    const scH = {
      x: { grid:{ color: App.chartDefaults().gridColor }, ticks:{ color:lc, font:{size:11}, callback:v=>App.formatCompact(v) }, border:{display:false} },
      y: { grid:{ display:false }, ticks:{ color:lc, font:{size:11} }, border:{display:false} }
    };
    App.createChart('chart-top5', {
      type: 'bar',
      data: { labels: top5.map(d => d.label), datasets: [{ label: sc2.valueLabel, data: top5.map(d=>d.total), backgroundColor:'#8b5cf6', borderRadius:4, borderSkipped:false }] },
      options: { indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ ...tt, callbacks:{label:ctx=>App.formatValue(ctx.raw)} } }, scales:scH }
    });
  }

  if (dowLabels.length) {
    App.createChart('chart-dow', {
      type: 'radar',
      data: { labels: dowLabels, datasets: [{ label: sc2.valueLabel, data: dowValues, borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,0.2)', borderWidth:2, pointBackgroundColor:'#22c55e', pointRadius:4 }] },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ ...tt, callbacks:{label:ctx=>App.formatValue(ctx.raw)} } },
        scales:{ r:{ grid:{ color: App.chartDefaults().gridColor }, ticks:{ color:lc, font:{size:10}, callback:v=>App.formatCompact(v), backdropColor:'transparent' }, pointLabels:{ color:lc, font:{size:12} } } }
      }
    });
  }
};
