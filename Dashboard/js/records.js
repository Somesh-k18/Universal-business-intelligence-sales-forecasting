
Pages.records = function () {
  const data = App.state.filteredData;
  const m = App.state.mapping;
  const sc2 = App.state.schema;
  const rs = App.state.recordsState;

  if (!m.entity) {
    document.getElementById('page-content').innerHTML = `<div class="loading-state"><span>No entity column was mapped for this dataset.</span></div>`;
    return;
  }

  const entMap = new Map();
  data.forEach(r => {
    if (!entMap.has(r.__entity)) entMap.set(r.__entity, { label:r.__entity, category: r.__category || null, count:0, total:0, groups:{}, months:{} });
    const e = entMap.get(r.__entity);
    e.count++; e.total += r.__value;
    if (m.group) e.groups[r.__group] = (e.groups[r.__group]||0) + r.__value;
    if (m.date) { const mo = DataUtils.fmt(r.__date,'MMM yyyy'); e.months[mo] = (e.months[mo]||0) + r.__value; }
  });
  const allRecords = [...entMap.values()].map(e => {
    const bestGroup = Object.entries(e.groups).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
    const bestMonth = Object.entries(e.months).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
    return { ...e, avg: e.count ? e.total/e.count : 0, bestGroup, bestMonth };
  });

  function getSorted() {
    let result = allRecords;
    if (rs.search) {
      const q = rs.search.toLowerCase();
      result = result.filter(p => String(p.label).toLowerCase().includes(q) || String(p.category||'').toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const va = a[rs.sortKey], vb = b[rs.sortKey];
      if (typeof va === 'string') return rs.sortOrder==='asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return rs.sortOrder==='asc' ? va - vb : vb - va;
    });
    return result;
  }

  function renderRecords() {
    const sorted = getSorted();
    const ipp = App.state.settings.itemsPerPage;
    const total = sorted.length;
    const totalPgs = Math.ceil(total / ipp);
    rs.page = Math.min(rs.page, totalPgs || 1);
    const page = sorted.slice((rs.page-1)*ipp, rs.page*ipp);

    document.getElementById('rec-table-body').innerHTML = page.length
      ? page.map(row => `
        <tr class="rec-row" data-entity="${encodeURIComponent(row.label)}" style="cursor:pointer">
          <td class="pl6 primary" style="font-weight:600">${row.label}</td>
          ${m.category ? `<td>${row.category||'—'}</td>` : ''}
          <td class="right">${row.count.toLocaleString()}</td>
          <td class="right bold">${App.formatValue(row.total)}</td>
          <td class="right muted">${App.formatValue(row.avg)}</td>
          ${m.group ? `<td class="right">${row.bestGroup}</td>` : ''}
          ${m.date ? `<td class="right">${row.bestMonth}</td>` : ''}
        </tr>`).join('')
      : `<tr class="empty-row"><td colspan="8">No records found.</td></tr>`;

    document.querySelectorAll('#rec-table thead th[data-sort]').forEach(th => {
      const active = th.dataset.sort === rs.sortKey;
      th.querySelector('span').textContent = active ? (rs.sortOrder==='asc'?'↑':'↓') : '↕';
      th.querySelector('span').style.opacity = active ? 1 : 0.3;
    });

    const pagEl = document.getElementById('rec-pagination');
    if (totalPgs > 1) {
      pagEl.innerHTML = `
        <div class="pagination-info">Showing ${(rs.page-1)*ipp+1}–${Math.min(rs.page*ipp,total)} of ${total}</div>
        <div class="pagination-controls">
          <button class="btn btn-outline btn-sm" id="pg-prev" ${rs.page===1?'disabled':''}>◀ Prev</button>
          <div class="page-num">${rs.page}</div>
          <button class="btn btn-outline btn-sm" id="pg-next" ${rs.page>=totalPgs?'disabled':''}>Next ▶</button>
        </div>`;
      document.getElementById('pg-prev')?.addEventListener('click', () => { rs.page--; renderRecords(); });
      document.getElementById('pg-next')?.addEventListener('click', () => { rs.page++; renderRecords(); });
    } else { pagEl.innerHTML = ''; }

    document.querySelectorAll('.rec-row').forEach(tr => tr.addEventListener('click', () => openRecordModal(decodeURIComponent(tr.dataset.entity))));
  }

  const byTotalDesc = [...allRecords].sort((a,b)=>b.total-a.total);
  const best = byTotalDesc[0], worst = byTotalDesc[byTotalDesc.length-1];

  document.getElementById('page-content').innerHTML = `
<div class="page-inner space-y-6">
  <div class="grid-3">
    <div class="stat-card green">
      <div class="stat-card-glow"></div>
      <div><div class="stat-card-label">Best Performing ${sc2.entityLabel}</div><div class="stat-card-value" style="font-size:1.3rem;word-break:break-word">${best?.label || '—'}</div></div>
      <div class="stat-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
    </div>
    <div class="stat-card indigo">
      <div class="stat-card-glow"></div>
      <div><div class="stat-card-label">Lowest Performing ${sc2.entityLabel}</div><div class="stat-card-value" style="font-size:1.3rem;word-break:break-word">${worst?.label || '—'}</div></div>
      <div class="stat-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg></div>
    </div>
    <div class="stat-card purple">
      <div class="stat-card-glow"></div>
      <div><div class="stat-card-label">Total ${sc2.entityLabel}s</div><div class="stat-card-value">${allRecords.length.toLocaleString()}</div></div>
      <div class="stat-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
    </div>
  </div>
  <div class="card">
    <div class="card-header flex">
      <div class="card-title">${sc2.entityLabel} Directory</div>
      <div class="search-wrap" style="width:280px">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="rec-search" class="search-input" placeholder="Search…" value="${rs.search}" />
      </div>
    </div>
    <div class="card-body p0">
      <div class="table-wrap">
        <table id="rec-table">
          <thead>
            <tr>
              <th class="sortable pl6" data-sort="label">${sc2.entityLabel} <span style="opacity:0.3;font-size:0.75rem">↕</span></th>
              ${m.category ? `<th class="sortable" data-sort="category">${sc2.categoryLabel} <span style="opacity:0.3;font-size:0.75rem">↕</span></th>` : ''}
              <th class="sortable right" data-sort="count">Records <span style="opacity:0.3;font-size:0.75rem">↕</span></th>
              <th class="sortable right" data-sort="total">Total ${sc2.valueLabel} <span style="opacity:0.3;font-size:0.75rem">↕</span></th>
              <th class="sortable right" data-sort="avg">Avg ${sc2.valueLabel} <span style="opacity:0.3;font-size:0.75rem">↕</span></th>
              ${m.group ? `<th class="sortable right" data-sort="bestGroup">Top ${sc2.groupLabel} <span style="opacity:0.3;font-size:0.75rem">↕</span></th>` : ''}
              ${m.date ? `<th class="sortable right" data-sort="bestMonth">Best Month <span style="opacity:0.3;font-size:0.75rem">↕</span></th>` : ''}
            </tr>
          </thead>
          <tbody id="rec-table-body"></tbody>
        </table>
      </div>
      <div id="rec-pagination" class="pagination"></div>
    </div>
  </div>
</div>`;

  document.querySelectorAll('#rec-table thead th[data-sort]').forEach(th => th.addEventListener('click', () => {
    if (rs.sortKey === th.dataset.sort) rs.sortOrder = rs.sortOrder==='asc'?'desc':'asc';
    else { rs.sortKey = th.dataset.sort; rs.sortOrder = 'desc'; }
    rs.page = 1;
    renderRecords();
  }));

  document.getElementById('rec-search').addEventListener('input', e => { rs.search = e.target.value; rs.page = 1; renderRecords(); });

  renderRecords();

  function openRecordModal(label) {
    const rows = data.filter(r => r.__entity === label);
    let trend = [];
    if (m.date) {
      const mMap = new Map();
      rows.forEach(r => { const k=DataUtils.fmt(r.__date,'MMM yy'); mMap.set(k,(mMap.get(k)||0)+r.__value); });
      trend = DataUtils.sortMonthEntries([...mMap.entries()].map(([Month,Total])=>({Month,Total})), x=>x.Month);
    }
    let groupPie = [];
    if (m.group) {
      const gMap = new Map();
      rows.forEach(r => gMap.set(r.__group,(gMap.get(r.__group)||0)+r.__value));
      groupPie = [...gMap.entries()].map(([name,value])=>({name,value}));
    }

    App.openModal(label, `
      <div class="modal-body">
        ${trend.length ? `<div class="modal-chart-card"><div class="modal-chart-title">${sc2.valueLabel} Trend</div><div class="modal-chart-wrap"><canvas id="modal-trend-chart"></canvas></div></div>` : ''}
        ${groupPie.length ? `<div class="modal-chart-card"><div class="modal-chart-title">${sc2.groupLabel} Split</div><div class="modal-chart-wrap"><canvas id="modal-group-chart"></canvas></div></div>` : ''}
        ${(!trend.length && !groupPie.length) ? `<div class="text-muted">No date or group column mapped — nothing more to visualize for this record.</div>` : ''}
      </div>`, () => {
      const tt = App.commonTooltip();
      const scales = App.commonScales();
      if (trend.length) {
        App.createChart('modal-trend-chart', {
          type: 'line',
          data: { labels: trend.map(d=>d.Month), datasets: [{ label:sc2.valueLabel, data: trend.map(d=>d.Total), borderColor:'#4F46E5', backgroundColor:'rgba(79,70,229,0.1)', borderWidth:3, fill:true, tension:0.3, pointRadius:4 }] },
          options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ ...tt, callbacks:{label:ctx=>App.formatValue(ctx.raw)} } }, scales }
        });
      }
      if (groupPie.length) {
        App.createChart('modal-group-chart', {
          type: 'doughnut',
          data: { labels: groupPie.map(d=>d.name), datasets: [{ data: groupPie.map(d=>d.value), backgroundColor:CHART_COLORS, borderWidth:2, borderColor: document.documentElement.classList.contains('dark')?'#1e293b':'#fff' }] },
          options: { responsive:true, maintainAspectRatio:false, cutout:'55%', plugins:{ legend:{ position:'bottom', labels:{ color:App.chartDefaults().labelColor, padding:10 } }, tooltip:{ ...tt, callbacks:{label:ctx=>`${ctx.label}: ${App.formatValue(ctx.raw)}`} } } }
        });
      }
    });
  }
};
