
Pages.dashboard = function () {
  const data = App.state.filteredData;
  const m = App.state.mapping;
  const sc2 = App.state.schema;


  const totalValue = DataUtils.sum(data);
  const totalRecords = data.length;
  const uniqueEntities = m.entity ? new Set(data.map(r => r.__entity)).size : null;
  const avgValue = totalRecords ? totalValue / totalRecords : 0;

  const kpis = [
    { label: `Total ${sc2.valueLabel}`, value: App.formatCompact(totalValue), colorClass:'green',
      icon:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
    { label: 'Total Records', value: totalRecords.toLocaleString(), colorClass:'blue',
      icon:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' },
  ];
  if (uniqueEntities !== null) kpis.push({ label: `Unique ${sc2.entityLabel}`, value: uniqueEntities.toLocaleString(), colorClass:'purple',
      icon:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' });
  kpis.push({ label: `Avg ${sc2.valueLabel}`, value: App.formatValue(avgValue), colorClass:'orange',
      icon:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' });


  const tableKey = m.entity ? '__entity' : (m.category ? '__category' : null);
  let topEntities = [];
  if (tableKey) {
    const map = new Map();
    data.forEach(r => {
      const k = r[tableKey];
      if (!map.has(k)) map.set(k, { label:k, total:0, count:0 });
      const e = map.get(k); e.total += (isNaN(r.__value)?0:r.__value); e.count++;
    });
    topEntities = [...map.values()].sort((a,b) => b.total - a.total);
  }

  const monthData = m.date ? DataUtils.groupByMonth(data) : [];
  const categoryData = m.category ? DataUtils.groupBy(data, '__category').sort((a,b)=>b.total-a.total).slice(0,8) : [];
  const groupData = m.group ? DataUtils.groupBy(data, '__group') : [];
  const quarterData = m.date ? DataUtils.groupByQuarter(data) : [];

  const chartCards = [];
  if (monthData.length) chartCards.push({ id:'chart-trend', title:`${sc2.valueLabel} Trend Over Time`, color:'#3b82f6' });
  if (groupData.length) chartCards.push({ id:'chart-group', title:`${sc2.groupLabel} Breakdown`, color:'#22c55e' });
  if (categoryData.length) chartCards.push({ id:'chart-category', title:`${sc2.categoryLabel} Distribution`, color:'#f59e0b' });
  if (quarterData.length) chartCards.push({ id:'chart-quarter', title:'Quarterly Totals', color:'#ef4444' });

  document.getElementById('page-content').innerHTML = `
<div class="page-inner space-y-6">

  <!-- KPI Cards -->
  <div class="kpi-grid">
    ${kpis.map(k => `
      <div class="kpi-card">
        <div class="kpi-icon ${k.colorClass}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${k.icon}</svg>
        </div>
        <div>
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.value}</div>
        </div>
      </div>`).join('')}
  </div>

  ${chartCards.length ? `
  <!-- Charts -->
  <div class="charts-grid">
    ${chartCards.map(c => `
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <div class="chart-divider" style="background:${c.color}"></div>
            ${c.title}
          </div>
        </div>
        <div class="card-body">
          <div class="chart-container"><canvas id="${c.id}"></canvas></div>
        </div>
      </div>`).join('')}
  </div>` : `<div class="card"><div class="card-body"><div class="text-muted">Not enough categorical/date structure detected to build charts — try mapping more columns in a future upload.</div></div></div>`}

  ${tableKey ? `
  <!-- Top Entities Table -->
  <div class="card">
    <div class="card-header flex">
      <div class="card-title">Top ${m.entity ? sc2.entityLabel : sc2.categoryLabel}s</div>
      <div class="search-wrap" style="width:260px">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="ent-search" class="search-input" placeholder="Search…" />
      </div>
    </div>
    <div class="card-body p0">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="pl6">${m.entity ? sc2.entityLabel : sc2.categoryLabel}</th>
              <th class="right">Records</th>
              <th class="right pl6">Total ${sc2.valueLabel}</th>
            </tr>
          </thead>
          <tbody id="ent-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>` : ''}

</div>`;

  if (tableKey) {
    const renderTable = (filter='') => {
      const rows = topEntities.filter(p => String(p.label).toLowerCase().includes(filter.toLowerCase())).slice(0, 10);
      const tbody = document.getElementById('ent-table-body');
      if (!tbody) return;
      tbody.innerHTML = rows.length
        ? rows.map((p, i) => `
          <tr>
            <td class="pl6">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="rank-badge">${i+1}</div>
                <span style="font-weight:600">${p.label}</span>
              </div>
            </td>
            <td class="right">${p.count.toLocaleString()}</td>
            <td class="right bold primary pl6">${App.formatValue(p.total)}</td>
          </tr>`).join('')
        : `<tr class="empty-row"><td colspan="3">No records found matching your search.</td></tr>`;
    };
    renderTable();
    document.getElementById('ent-search').addEventListener('input', e => renderTable(e.target.value));
  }

  /* Build charts */
  const scales = App.commonScales();
  const tt = App.commonTooltip();

  if (monthData.length) {
    App.createChart('chart-trend', {
      type: 'line',
      data: { labels: monthData.map(d => d.Month), datasets: [{
        label: sc2.valueLabel, data: monthData.map(d => d.Total),
        borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)',
        borderWidth: 3, pointRadius: 4, pointBackgroundColor: '#3b82f6', fill: true, tension: 0.4
      }]},
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ ...tt, callbacks:{ label: ctx => App.formatValue(ctx.raw) } } }, scales }
    });
  }

  if (groupData.length) {
    App.createChart('chart-group', {
      type: 'bar',
      data: { labels: groupData.map(d => d.label), datasets: [{ label: sc2.valueLabel, data: groupData.map(d => d.total), backgroundColor: '#22c55e', borderRadius: 6, borderSkipped: false }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ ...tt, callbacks:{ label: ctx => App.formatValue(ctx.raw) } } }, scales }
    });
  }

  if (categoryData.length) {
    App.createChart('chart-category', {
      type: 'doughnut',
      data: { labels: categoryData.map(d => d.label), datasets: [{ data: categoryData.map(d => d.total), backgroundColor: CHART_COLORS.slice(0, categoryData.length), borderWidth: 2, borderColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff' }] },
      options: { responsive:true, maintainAspectRatio:false, cutout:'55%', plugins:{ legend:{ position:'bottom', labels:{ color: App.chartDefaults().labelColor, padding:12, font:{ size:12 } } }, tooltip:{ ...tt, callbacks:{ label: ctx => `${ctx.label}: ${App.formatValue(ctx.raw)}` } } } }
    });
  }

  if (quarterData.length) {
    App.createChart('chart-quarter', {
      type: 'bar',
      data: { labels: quarterData.map(d => d.Quarter), datasets: [{ label: sc2.valueLabel, data: quarterData.map(d => d.Total), backgroundColor: '#ef4444', borderRadius: 6, borderSkipped: false }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ ...tt, callbacks:{ label: ctx => App.formatValue(ctx.raw) } } }, scales }
    });
  }
};
