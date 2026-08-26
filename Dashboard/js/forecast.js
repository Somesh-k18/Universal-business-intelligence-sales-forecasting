
Pages.forecast = function () {
  const m = App.state.mapping;
  const sc2 = App.state.schema;

  if (!m.date) {
    document.getElementById('page-content').innerHTML = `
      <div class="page-inner space-y-6 max-w-5xl">
        <div class="card"><div class="card-body">
          <div class="loading-state" style="height:300px">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="opacity:0.4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Forecasting is unavailable because the uploaded dataset does not contain a mapped date column.</span>
          </div>
        </div></div>
      </div>`;
    return;
  }

  const data = App.state.filteredData;
  const horizon = App.state.forecastHorizon || 3;

  const monthMap = new Map();
  data.forEach(r => {
    const key = DataUtils.fmt(r.__date, 'yyyy-MM');
    if (!monthMap.has(key)) monthMap.set(key, { date: new Date(r.__date.getFullYear(), r.__date.getMonth(), 1), val: 0 });
    monthMap.get(key).val += r.__value;
  });

  const sortedMonths = [...monthMap.values()].sort((a,b) => a.date - b.date);
  const historical = sortedMonths.slice(-6);

  let nextMonthVal = 0, next3Total = 0, confidenceMsg = 'No data available.';
  let forecastData = [];

  if (historical.length >= 2) {
    const yVals = historical.map(h => h.val);
    const { slope, intercept } = DataUtils.linearRegression(yVals);

    forecastData = historical.map(h => ({ Month: DataUtils.fmt(h.date,'MMM yy'), Historical: h.val, Projected: null }));
    forecastData[historical.length-1].Projected = forecastData[historical.length-1].Historical;

    for (let i = 1; i <= horizon; i++) {
      const projDate = new Date(historical[historical.length-1].date);
      projDate.setMonth(projDate.getMonth() + i);
      const projVal = Math.max(0, intercept + slope * (historical.length - 1 + i));
      if (i === 1) nextMonthVal = projVal;
      next3Total += projVal;
      forecastData.push({ Month: DataUtils.fmt(projDate,'MMM yy'), Historical: null, Projected: projVal });
    }
    confidenceMsg = `Based on ${historical.length} months of historical data using simple linear regression.`;
  } else if (historical.length > 0) {
    confidenceMsg = 'Insufficient data for projection (need at least 2 months).';
  }

  const lastHistorical = historical.length ? historical[historical.length-1].val : 0;
  const pctVsLast = lastHistorical > 0 ? ((nextMonthVal - lastHistorical) / lastHistorical * 100).toFixed(1) : null;

  document.getElementById('page-content').innerHTML = `
<div class="page-inner space-y-6 max-w-5xl">

  <div class="h-title">
    <div class="h-title-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
    </div>
    <div>
      <div class="h-title-text">${sc2.valueLabel} Forecasting</div>
      <div class="h-title-sub">Predictive modeling based on historical trends</div>
    </div>
  </div>

  <div class="theme-btn-group" style="max-width:420px" id="horizon-group">
    <button class="theme-btn ${horizon===1?'active':''}" data-h="1">Next Month</button>
    <button class="theme-btn ${horizon===3?'active':''}" data-h="3">Next Quarter</button>
    <button class="theme-btn ${horizon===6?'active':''}" data-h="6">Next 6 Months</button>
  </div>

  <div class="forecast-cards">
    <div class="forecast-kpi-card">
      <div class="forecast-kpi-top">
        <div>
          <div class="forecast-kpi-label">Next Month Projection</div>
          <div class="forecast-kpi-value">${App.formatValue(nextMonthVal)}</div>
        </div>
        <div class="forecast-kpi-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
      </div>
      ${pctVsLast !== null ? `
      <div class="forecast-badge">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
        ${pctVsLast}% vs last month
      </div>` : ''}
    </div>

    <div class="forecast-kpi-card">
      <div class="forecast-kpi-top">
        <div>
          <div class="forecast-kpi-label">${horizon===1?'Next Month Total':horizon===3?'Q-Forward (Next 3 Mos)':'H-Forward (Next 6 Mos)'}</div>
          <div class="forecast-kpi-value normal">${App.formatValue(next3Total)}</div>
        </div>
        <div class="forecast-kpi-icon secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
        </div>
      </div>
      <div class="forecast-hint">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        ${confidenceMsg}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header" style="border-bottom:1px solid var(--border);background:rgba(0,0,0,0.02)">
      <div class="card-title">Projected ${sc2.valueLabel} Timeline</div>
      <div class="card-desc">Historical data (solid) combined with linear regression projection (dashed).</div>
    </div>
    <div class="card-body" style="padding:24px">
      ${forecastData.length > 0
        ? `<div class="chart-container" style="height:400px"><canvas id="chart-forecast"></canvas></div>`
        : `<div class="loading-state" style="height:400px">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="opacity:0.4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
             <span>Not enough data to generate forecast.</span>
           </div>`}
    </div>
  </div>
</div>`;

  document.querySelectorAll('#horizon-group .theme-btn').forEach(btn => btn.addEventListener('click', () => {
    App.state.forecastHorizon = parseInt(btn.dataset.h);
    App.destroyCharts();
    Pages.forecast();
  }));

  if (forecastData.length === 0) return;

  const tt = App.commonTooltip();
  const scales = App.commonScales();

  App.createChart('chart-forecast', {
    type: 'line',
    data: {
      labels: forecastData.map(d => d.Month),
      datasets: [
        { label: 'Historical', data: forecastData.map(d => d.Historical), borderColor:'#4F46E5', backgroundColor:'rgba(79,70,229,0.12)', borderWidth:3, pointRadius:4, pointBackgroundColor:'#4F46E5', fill:true, tension:0.3, spanGaps:true },
        { label: 'Projected', data: forecastData.map(d => d.Projected), borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,0.08)', borderWidth:3, borderDash:[6,4], pointRadius:4, pointBackgroundColor:'#f59e0b', fill:true, tension:0.3, spanGaps:true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: App.chartDefaults().labelColor, padding: 16 } }, tooltip: { ...tt, callbacks: { label: ctx => `${ctx.dataset.label}: ${App.formatValue(ctx.raw)}` } } },
      scales
    }
  });
};
