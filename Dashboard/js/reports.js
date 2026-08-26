
Pages.reports = function () {
  const data = App.state.filteredData;
  const m = App.state.mapping;
  const sc2 = App.state.schema;
  const fields = data.length ? Object.keys(data[0].__raw) : [];

  
  let yearlyStats = [];
  if (m.date) {
    const yearMap = new Map();
    data.forEach(r => {
      const y = String(r.__date.getFullYear());
      if (!yearMap.has(y)) yearMap.set(y, { count:0, total:0 });
      yearMap.get(y).count++; yearMap.get(y).total += r.__value;
    });
    yearlyStats = [...yearMap.entries()].map(([Year,d]) => ({ Year, count:d.count, total:d.total, avg: d.count ? d.total/d.count : 0 })).sort((a,b)=>b.Year.localeCompare(a.Year));
  }

 
  const totalValue = DataUtils.sum(data);
  let catStats = [];
  if (m.category) {
    catStats = DataUtils.groupBy(data, '__category').map(d => ({ ...d, pct: totalValue ? (d.total/totalValue*100) : 0 })).sort((a,b)=>b.total-a.total);
  }

  const topCat = catStats[0];
  const avgAll = data.length ? totalValue/data.length : 0;
  const nowStr = new Date().toLocaleString('en-IN', { dateStyle:'long', timeStyle:'short' });

  function exportCSV() {
    if (!data.length) return;
    const rows = data.map(r => fields.map(f => {
      const v = r.__raw[f];
      return typeof v === 'string' ? `"${v.replace(/"/g,'""')}"` : v;
    }).join(','));
    const csv = [fields.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bi-export-${DataUtils.fmt(new Date(),'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    if (!data.length) return;
    const rows = data.map(r => r.__raw);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `bi-export-${DataUtils.fmt(new Date(),'yyyy-MM-dd')}.xlsx`);
  }

  document.getElementById('page-content').innerHTML = `
<div class="page-inner space-y-6 max-w-5xl">

  <div class="report-header print-hidden">
    <div class="report-header-left">
      <div class="report-header-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      </div>
      <div>
        <div style="font-size:1.15rem;font-weight:700">Report Generation</div>
        <div class="text-muted">Export filtered data or print current views.</div>
      </div>
    </div>
    <div class="report-actions">
      <button id="export-csv-btn" class="btn btn-green">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export CSV
      </button>
      <button id="export-excel-btn" class="btn btn-outline">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="9"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        Export Excel
      </button>
      <button id="print-btn" class="btn btn-outline">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save as PDF
      </button>
    </div>
  </div>

  <div class="grid-2">
    ${yearlyStats.length ? `
    <div class="card">
      <div class="card-header"><div class="card-title">Yearly Performance Summary</div></div>
      <div class="card-body p0">
        <div class="table-wrap">
          <table>
            <thead><tr><th class="pl6">Year</th><th class="right">Records</th><th class="right">Total ${sc2.valueLabel}</th><th class="right pl6">Avg</th></tr></thead>
            <tbody>
              ${yearlyStats.map(row => `
                <tr>
                  <td class="pl6" style="font-weight:600">${row.Year}</td>
                  <td class="right">${row.count.toLocaleString()}</td>
                  <td class="right primary" style="font-weight:600">${App.formatValue(row.total)}</td>
                  <td class="right pl6">${App.formatValue(row.avg)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>` : `<div class="card"><div class="card-body"><div class="text-muted">Map a Date column to see a yearly performance summary.</div></div></div>`}

    ${catStats.length ? `
    <div class="card">
      <div class="card-header"><div class="card-title">${sc2.categoryLabel} Breakdown</div></div>
      <div class="card-body p0">
        <div class="table-wrap">
          <table>
            <thead><tr><th class="pl6">${sc2.categoryLabel}</th><th class="right">Records</th><th class="right">Total</th><th class="right pl6">% of Total</th></tr></thead>
            <tbody>
              ${catStats.map(row => `
                <tr>
                  <td class="pl6" style="font-weight:600">${row.label}</td>
                  <td class="right">—</td>
                  <td class="right" style="font-weight:600">${App.formatValue(row.total)}</td>
                  <td class="right pl6">
                    <div class="progress-row">
                      <span>${row.pct.toFixed(1)}%</span>
                      <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${row.pct}%"></div></div>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>` : `<div class="card"><div class="card-body"><div class="text-muted">Map a Category column to see a category breakdown.</div></div></div>`}
  </div>

  <div class="card">
    <div class="card-header">
      <div class="card-title">Executive Summary (Print View)</div>
      <div class="card-desc">A concise, printable summary of the current filter scope.</div>
    </div>
    <div class="card-body">
      <div class="prose">
        <p>This report covers <strong>${data.length.toLocaleString()} records</strong>. The total ${sc2.valueLabel.toLowerCase()} across this selection is <strong>${App.formatValue(totalValue)}</strong>.</p>
        <ul>
          ${topCat ? `<li>The highest performing ${sc2.categoryLabel.toLowerCase()} is <strong>${topCat.label}</strong> with ${App.formatValue(topCat.total)}.</li>` : ''}
          <li>Average ${sc2.valueLabel.toLowerCase()} per record stands at ${App.formatValue(avgAll)}.</li>
        </ul>
        <p class="meta">Generated on ${nowStr}</p>
      </div>
    </div>
  </div>

</div>`;

  document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
  document.getElementById('export-excel-btn').addEventListener('click', exportExcel);
  document.getElementById('print-btn').addEventListener('click', () => window.print());
};
