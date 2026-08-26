
const Flow = {
  state: {
    fileName: '', fileSize: 0, fileType: '', uploadTime: null,
    fields: [],
    rawRows: [],       
    profile: [],       
    domain: null,       
    mapping: null,       
    validation: null,
    previewTab: 'first', previewSearch: '', previewSort: null, previewOrder: 'asc', previewPage: 1,
  },

  init() {
    Flow.animateStats();
    Flow.bindLanding();
  },


  animateStats() {
    document.querySelectorAll('.stat-counter').forEach(el => {
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const dur = 1400;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target < 10 ? (target*eased).toFixed(1) : Math.round(target*eased).toLocaleString()) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  },

  bindLanding() {
    const dz = document.getElementById('dropzone');
    const csvInput = document.getElementById('csv-input');
    const excelInput = document.getElementById('excel-input');

    document.getElementById('btn-upload-csv').addEventListener('click', () => csvInput.click());
    document.getElementById('btn-upload-excel').addEventListener('click', () => excelInput.click());
    document.getElementById('btn-demo-data').addEventListener('click', () => Flow.loadDemoData());

    csvInput.addEventListener('change', e => { if (e.target.files[0]) Flow.handleFile(e.target.files[0]); });
    excelInput.addEventListener('change', e => { if (e.target.files[0]) Flow.handleFile(e.target.files[0]); });

    dz.addEventListener('click', () => csvInput.click());
    ;['dragenter','dragover'].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.add('drag-active'); }));
    ;['dragleave','drop'].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.remove('drag-active'); }));
    dz.addEventListener('drop', e => { if (e.dataTransfer.files[0]) Flow.handleFile(e.dataTransfer.files[0]); });
  },

  loadDemoData() {
    const { rows, fields } = DataUtils.generateMockData();
    Flow.state.fileName = 'demo-sales-data.csv';
    Flow.state.fileSize = JSON.stringify(rows).length;
    Flow.state.fileType = 'text/csv (generated demo)';
    Flow.state.uploadTime = new Date();
    Flow.state.fields = fields;
    Flow.state.rawRows = rows;
    Flow.afterParse();
  },

  async handleFile(file) {
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) { App.toast('File too large', 'Maximum upload size is 20 MB.'); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv','xlsx','xls'].includes(ext)) { App.toast('Unsupported file type', 'Please upload a CSV, XLSX, or XLS file.'); return; }

    Flow.showStep('view-workflow');
    Flow.renderLoadingStep('Reading your file…');

    try {
      let parsed;
      if (ext === 'csv') parsed = await DataUtils.parseCSVFile(file);
      else parsed = await DataUtils.parseExcelFile(file);

      Flow.state.fileName = file.name;
      Flow.state.fileSize = file.size;
      Flow.state.fileType = ext.toUpperCase();
      Flow.state.uploadTime = new Date();
      Flow.state.fields = parsed.fields.filter(f => f && f.trim());
      Flow.state.rawRows = parsed.rows;
      Flow.afterParse();
    } catch (err) {
      Flow.renderErrorStep(err.message || 'Failed to parse file.');
    }
  },

  afterParse() {
    Flow.state.profile = Schema.profileColumns(Flow.state.rawRows, Flow.state.fields);
    Flow.state.domain = Schema.detectDomain(Flow.state.fields);
    Flow.state.mapping = Schema.suggestMapping(Flow.state.profile);
    Flow.state.validation = DataUtils.validate(Flow.state.rawRows, Flow.state.fields, Flow.state.profile);
    Flow.renderValidation();
  },

  showStep(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderLoadingStep(msg) {
    document.getElementById('workflow-content').innerHTML = `
      <div class="wf-loading"><div class="spinner"></div><span>${msg}</span></div>`;
  },

  renderErrorStep(msg) {
    document.getElementById('workflow-content').innerHTML = `
      <div class="wf-card wf-error-card">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div class="wf-error-title">Couldn't read this file</div>
        <div class="text-muted">${msg}</div>
        <button class="btn btn-outline" onclick="Flow.showStep('view-landing')">Back to upload</button>
      </div>`;
  },

  stepperHTML(activeIdx) {
    const steps = ['Upload','Validate','Map Columns','Preview','Clean','Analyze'];
    return steps.map((s,i) => `
      <div class="wf-step ${i===activeIdx?'active':''} ${i<activeIdx?'done':''}">
        <div class="wf-step-dot">${i<activeIdx?'✓':i+1}</div><span>${s}</span>
      </div>`).join('<div class="wf-step-line"></div>');
  },


  renderValidation() {
    const s = Flow.state;
    const v = s.validation;
    const hasBlocker = !v.hasNumericColumn || s.rawRows.length === 0;

    const infoCard = `
      <div class="wf-card">
        <div class="wf-card-title">File Uploaded</div>
        <div class="wf-info-grid">
          <div class="wf-info-item"><span>Dataset Name</span><strong>${s.fileName}</strong></div>
          <div class="wf-info-item"><span>Rows</span><strong>${s.rawRows.length.toLocaleString()}</strong></div>
          <div class="wf-info-item"><span>Columns</span><strong>${s.fields.length}</strong></div>
          <div class="wf-info-item"><span>File Size</span><strong>${DataUtils.formatBytes(s.fileSize)}</strong></div>
          <div class="wf-info-item"><span>Upload Time</span><strong>${s.uploadTime.toLocaleTimeString()}</strong></div>
          <div class="wf-info-item"><span>Detected Type</span><strong>${s.domain.domain} Dataset</strong></div>
        </div>
      </div>`;

    const statusRows = [
      { label: 'Numeric Column Present', ok: v.hasNumericColumn, detail: v.hasNumericColumn ? 'At least one numeric column found' : 'No numeric column detected — required for KPIs & charts' },
      { label: 'Missing Values', ok: v.missingValues === 0, detail: `${v.missingValues} row(s) affected` },
      { label: 'Duplicate Rows', ok: v.duplicateRows === 0, detail: `${v.duplicateRows} duplicate(s) found` },
      { label: 'Empty Rows', ok: v.emptyRows === 0, detail: `${v.emptyRows} empty row(s) found` },
    ];

    const validationCards = statusRows.map(r => `
      <div class="val-card ${r.ok ? 'ok' : 'warn'}">
        <div class="val-card-icon">
          ${r.ok
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>'}
        </div>
        <div>
          <div class="val-card-label">${r.label}</div>
          <div class="val-card-detail">${r.detail}</div>
        </div>
      </div>`).join('');

    document.getElementById('workflow-content').innerHTML = `
      <div class="wf-stepper">${Flow.stepperHTML(1)}</div>
      ${infoCard}
      <div class="wf-card">
        <div class="wf-card-title">Data Validation</div>
        <div class="val-grid">${validationCards}</div>
        <div class="wf-actions">
          <button id="btn-download-report" class="btn btn-outline">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Validation Report
          </button>
          ${hasBlocker
            ? `<button class="btn btn-outline" onclick="Flow.showStep('view-landing')">Upload a different file</button>`
            : `<button id="btn-continue-map" class="btn btn-primary">Continue to Column Mapping →</button>`}
        </div>
        ${hasBlocker ? `<div class="wf-blocker-note">This dataset needs at least one numeric column and one or more data rows to continue.</div>` : ''}
      </div>`;

    document.getElementById('btn-download-report').addEventListener('click', Flow.downloadValidationReport);
    if (!hasBlocker) document.getElementById('btn-continue-map').addEventListener('click', Flow.renderMapping);
  },

  downloadValidationReport() {
    const v = Flow.state.validation;
    const lines = [
      `Validation Report — ${Flow.state.fileName}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Detected Dataset Type: ${Flow.state.domain.domain}`,
      `Total Rows: ${v.totalRows}`,
      `Total Columns: ${v.totalColumns}`,
      `Numeric Column Present: ${v.hasNumericColumn ? 'Yes' : 'No'}`,
      `Missing Values: ${v.missingValues}`,
      `Duplicate Rows: ${v.duplicateRows}`,
      `Empty Rows: ${v.emptyRows}`,
      '',
      'Issues:',
      ...(v.issues.length ? v.issues.map(i => `- ${i}`) : ['- None, dataset looks clean!'])
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'validation-report.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },


  renderMapping() {
    const s = Flow.state;
    const typeIcon = { numeric:'#3b82f6', date:'#22c55e', categorical:'#f59e0b', text:'#8b5cf6' };

    const roleDefs = [
      { role:'value',    label:'Value / Measure',    required:true,  help:'The main number to sum & analyze (e.g. Revenue, Amount, Marks, Salary).', types:['numeric'] },
      { role:'date',     label:'Date',               required:false, help:'Enables trends over time and forecasting.', types:['date'] },
      { role:'category',  label:'Category',            required:false, help:'Primary grouping, e.g. Category, Subject, Department.', types:['categorical'] },
      { role:'group',     label:'Group / Region',      required:false, help:'Secondary grouping, e.g. Region, Gender, Branch.', types:['categorical'] },
      { role:'entity',    label:'Entity Name',         required:false, help:'Individual record label, e.g. Product, Employee, Student.', types:['categorical','text'] },
    ];

    const optionsFor = (role, types) => {
      const candidates = s.profile.filter(c => types.includes(c.type));
      const opts = candidates.map(c => `<option value="${c.name}" ${s.mapping[role]===c.name?'selected':''}>${c.name} (${c.type})</option>`).join('');
      const notAvail = `<option value="" ${!s.mapping[role]?'selected':''}>${role==='value' ? 'Select a column…' : 'Not Available'}</option>`;
      return notAvail + opts;
    };

    document.getElementById('workflow-content').innerHTML = `
      <div class="wf-stepper">${Flow.stepperHTML(2)}</div>
      <div class="wf-card">
        <div class="wf-card-title">Smart Column Mapping</div>
        <div class="text-muted" style="margin-bottom:16px">
          We auto-detected this as a <strong>${s.domain.domain}</strong> dataset and matched columns to roles below. Review and adjust as needed — fields marked "Not Available" will simply be skipped.
        </div>
        <div class="mapping-grid" id="mapping-grid">
          ${roleDefs.map(rd => `
            <div class="mapping-item">
              <div class="form-label">${rd.label} ${rd.required ? '<span style="color:var(--destructive)">*</span>' : ''}
                ${s.mapping.confidence[rd.role] ? '<span class="confidence-badge auto">Auto-detected</span>' : '<span class="confidence-badge manual">Please verify</span>'}
              </div>
              <select class="form-select map-select" data-role="${rd.role}">${optionsFor(rd.role, rd.types)}</select>
              <div class="mapping-help">${rd.help}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="wf-card">
        <div class="wf-card-title">Detected Columns</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th class="pl6">Column</th><th>Type</th><th>Unique Values</th><th class="pl6">Sample</th></tr></thead>
            <tbody>
              ${s.profile.map(c => `
                <tr>
                  <td class="pl6" style="font-weight:600">${c.name}</td>
                  <td><span class="badge" style="background:${typeIcon[c.type]}22;color:${typeIcon[c.type]}">${c.type}</span></td>
                  <td>${c.uniqueCount.toLocaleString()}</td>
                  <td class="pl6 text-muted">${c.sample.slice(0,3).join(', ') || '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="wf-card">
        <div class="wf-actions">
          <button class="btn btn-outline" onclick="Flow.renderValidation()">← Back</button>
          <button id="btn-continue-preview" class="btn btn-primary" ${s.mapping.value?'':'disabled'}>Continue to Preview →</button>
        </div>
        ${!s.mapping.value ? `<div class="wf-blocker-note">Select a Value / Measure column to continue.</div>` : ''}
      </div>`;

    document.querySelectorAll('.map-select').forEach(sel => sel.addEventListener('change', () => {
      s.mapping[sel.dataset.role] = sel.value || null;
      s.mapping.confidence[sel.dataset.role] = true;
      Flow.renderMapping();
    }));

    const contBtn = document.getElementById('btn-continue-preview');
    if (contBtn) contBtn.addEventListener('click', Flow.renderPreview);
  },

 
  renderPreview() {
    const s = Flow.state;
    const cols = s.fields;

    const getRows = () => {
      let rows = s.rawRows;
      if (s.previewTab === 'first') rows = rows.slice(0, 10);
      else if (s.previewTab === 'last') rows = rows.slice(-10);
      else if (s.previewTab === 'random') rows = [...rows].sort(() => Math.random() - 0.5).slice(0, 10);
      return rows;
    };

    document.getElementById('workflow-content').innerHTML = `
      <div class="wf-stepper">${Flow.stepperHTML(3)}</div>
      <div class="wf-card">
        <div class="wf-card-title flex">
          <span>Data Preview</span>
          <div class="search-wrap" style="width:240px">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="preview-search" class="search-input" placeholder="Search rows…" value="${s.previewSearch}" />
          </div>
        </div>
        <div class="wf-tabs">
          <button class="wf-tab ${s.previewTab==='first'?'active':''}" data-tab="first">First 10</button>
          <button class="wf-tab ${s.previewTab==='last'?'active':''}" data-tab="last">Last 10</button>
          <button class="wf-tab ${s.previewTab==='random'?'active':''}" data-tab="random">Random Sample</button>
          <button class="wf-tab ${s.previewTab==='all'?'active':''}" data-tab="all">All Rows (paged)</button>
        </div>
        <div class="table-wrap" id="preview-table-wrap"></div>
        <div id="preview-pagination" class="pagination"></div>
        <div class="wf-actions">
          <button class="btn btn-outline" onclick="Flow.renderMapping()">← Back</button>
          <button id="btn-continue-clean" class="btn btn-primary">Continue to Cleaning →</button>
        </div>
      </div>`;

    const renderTable = () => {
      let rows = getRows();
      if (s.previewSearch) {
        const q = s.previewSearch.toLowerCase();
        rows = rows.filter(r => cols.some(c => String(r[c]).toLowerCase().includes(q)));
      }
      if (s.previewSort) {
        rows = [...rows].sort((a,b) => {
          const va = a[s.previewSort], vb = b[s.previewSort];
          const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
          return s.previewOrder === 'asc' ? cmp : -cmp;
        });
      }

      let pageRows = rows, totalPgs = 1;
      if (s.previewTab === 'all') {
        totalPgs = Math.max(1, Math.ceil(rows.length / 15));
        s.previewPage = Math.min(s.previewPage, totalPgs);
        pageRows = rows.slice((s.previewPage-1)*15, s.previewPage*15);
      }

      const wrap = document.getElementById('preview-table-wrap');
      wrap.innerHTML = `
        <table>
          <thead><tr>${cols.map(c => `<th class="sortable pv-sort" data-col="${c}">${c} ${s.previewSort===c?(s.previewOrder==='asc'?'↑':'↓'):''}</th>`).join('')}</tr></thead>
          <tbody>
            ${pageRows.length ? pageRows.map(r => `<tr>${cols.map(c => `<td>${r[c]===''||r[c]===undefined||r[c]===null?'<span class="text-muted">—</span>':r[c]}</td>`).join('')}</tr>`).join('')
              : `<tr class="empty-row"><td colspan="${cols.length}">No rows match your search.</td></tr>`}
          </tbody>
        </table>`;
      wrap.querySelectorAll('.pv-sort').forEach(th => th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (s.previewSort === col) s.previewOrder = s.previewOrder === 'asc' ? 'desc' : 'asc';
        else { s.previewSort = col; s.previewOrder = 'asc'; }
        renderTable();
      }));

      const pagEl = document.getElementById('preview-pagination');
      if (s.previewTab === 'all' && totalPgs > 1) {
        pagEl.innerHTML = `
          <div class="pagination-info">Page ${s.previewPage} of ${totalPgs} — ${rows.length} rows</div>
          <div class="pagination-controls">
            <button class="btn btn-outline btn-sm" id="pv-prev" ${s.previewPage===1?'disabled':''}>◀ Prev</button>
            <button class="btn btn-outline btn-sm" id="pv-next" ${s.previewPage>=totalPgs?'disabled':''}>Next ▶</button>
          </div>`;
        document.getElementById('pv-prev')?.addEventListener('click', () => { s.previewPage--; renderTable(); });
        document.getElementById('pv-next')?.addEventListener('click', () => { s.previewPage++; renderTable(); });
      } else { pagEl.innerHTML = ''; }
    };

    document.querySelectorAll('.wf-tab').forEach(btn => btn.addEventListener('click', () => {
      s.previewTab = btn.dataset.tab; s.previewPage = 1;
      document.querySelectorAll('.wf-tab').forEach(b => b.classList.toggle('active', b===btn));
      renderTable();
    }));
    document.getElementById('preview-search').addEventListener('input', e => { s.previewSearch = e.target.value; renderTable(); });
    document.getElementById('btn-continue-clean').addEventListener('click', Flow.renderCleaning);

    renderTable();
  },


  renderCleaning() {
    const s = Flow.state;
    const numericFields = s.profile.filter(c => c.type === 'numeric').map(c => c.name);
    const textFields = s.profile.filter(c => c.type === 'categorical' || c.type === 'text').map(c => c.name);

    const actions = [
      { id: 'dedupe', label: 'Remove Duplicate Rows', fn: rows => DataUtils.cleanRemoveDuplicates(rows, s.fields) },
      { id: 'fillmissing', label: 'Fill Missing Values', fn: rows => DataUtils.cleanFillMissing(rows, s.fields, s.profile) },
      { id: 'blankrows', label: 'Remove Blank Rows', fn: rows => DataUtils.cleanRemoveBlankRows(rows, s.fields) },
      { id: 'dateformat', label: 'Convert Date Format', fn: rows => DataUtils.cleanNormalizeDates(rows, s.mapping.date) },
      { id: 'numbers', label: 'Standardize Numbers', fn: rows => DataUtils.cleanStandardizeNumbers(rows, numericFields) },
      { id: 'normtext', label: 'Normalize Text', fn: rows => DataUtils.cleanNormalizeText(rows, textFields) },
      { id: 'invalid', label: 'Remove Invalid Records', fn: rows => DataUtils.cleanRemoveInvalid(rows, s.mapping) },
    ];

    const renderSummaryCards = () => {
      const sum = DataUtils.computeSummary(s.rawRows, s.fields, s.profile, s.fileSize);
      document.getElementById('clean-summary').innerHTML = `
        <div class="summary-grid">
          ${[
            ['Total Rows', sum.totalRows.toLocaleString()],
            ['Total Columns', sum.totalColumns],
            ['Numeric Columns', sum.numericColumns],
            ['Categorical Columns', sum.categoricalColumns],
            ['Date Columns', sum.dateColumns],
            ['Memory Usage', sum.memoryUsage],
            ['File Size', sum.fileSize],
            ['Data Quality Score', sum.qualityScore + '%'],
            ['Missing Values', sum.missingValues],
            ['Duplicate Records', sum.duplicateRecords],
          ].map(([label,val]) => `<div class="summary-mini-card"><div class="summary-mini-label">${label}</div><div class="summary-mini-value">${val}</div></div>`).join('')}
        </div>`;
    };

    document.getElementById('workflow-content').innerHTML = `
      <div class="wf-stepper">${Flow.stepperHTML(4)}</div>
      <div class="wf-card">
        <div class="wf-card-title">Dataset Summary</div>
        <div id="clean-summary"></div>
      </div>
      <div class="wf-card">
        <div class="wf-card-title">Data Cleaning</div>
        <div class="text-muted" style="margin-bottom:12px">One-click cleanup — apply any that your dataset needs.</div>
        <div class="clean-actions" id="clean-actions">
          ${actions.map(a => `<button class="btn btn-outline clean-btn" data-id="${a.id}">${a.label}</button>`).join('')}
        </div>
      </div>
      <div class="wf-card">
        <div class="wf-card-title">Ready to Analyze</div>
        <div class="text-muted" style="margin-bottom:16px">Your data will be normalized against your column mapping and used to build the dashboard, forecasts, and insights.</div>
        <div class="wf-actions">
          <button class="btn btn-outline" onclick="Flow.renderPreview()">← Back</button>
          <button id="btn-analyze" class="btn btn-primary btn-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Analyze Dataset
          </button>
        </div>
      </div>`;

    renderSummaryCards();

    document.querySelectorAll('.clean-btn').forEach(btn => btn.addEventListener('click', () => {
      const action = actions.find(a => a.id === btn.dataset.id);
      const result = action.fn(s.rawRows);
      s.rawRows = result.rows;
      App.toast(action.label, result.count > 0 ? `${result.count} row(s) affected.` : 'No changes needed — already clean.');
      renderSummaryCards();
    }));

    document.getElementById('btn-analyze').addEventListener('click', Flow.startAnalyze);
  },


  startAnalyze() {
    const messages = [
      'Cleaning Data…', 'Applying Column Mapping…', 'Generating KPIs…',
      'Building Charts…', 'Generating Business Insights…', 'Running Forecast Model…',
      'Preparing Dashboard…', 'Done!'
    ];
    document.getElementById('workflow-content').innerHTML = `
      <div class="wf-analyze">
        <div class="wf-analyze-ring"><div class="spinner big"></div></div>
        <div id="analyze-msg" class="wf-analyze-msg">${messages[0]}</div>
        <div class="wf-analyze-bar"><div id="analyze-bar-fill" class="wf-analyze-bar-fill"></div></div>
      </div>`;
    let i = 0;
    const bar = document.getElementById('analyze-bar-fill');
    const msgEl = document.getElementById('analyze-msg');
    const step = () => {
      i++;
      if (i < messages.length) {
        msgEl.textContent = messages[i];
        bar.style.width = `${(i/(messages.length-1))*100}%`;
        setTimeout(step, i === messages.length-1 ? 400 : 500);
      } else {
        setTimeout(Flow.launchDashboard, 300);
      }
    };
    setTimeout(step, 500);
  },

  launchDashboard() {
    const s = Flow.state;
    const normalized = DataUtils.normalize(s.rawRows, s.mapping);

    const labelFor = role => s.mapping[role] || null;
    const schema = {
      domain: s.domain.domain,
      valueLabel: labelFor('value') || s.domain.valueLabel,
      categoryLabel: labelFor('category') || 'Category',
      groupLabel: labelFor('group') || 'Group',
      entityLabel: labelFor('entity') || 'Item',
      dateLabel: labelFor('date') || 'Date',
      isMonetary: Schema.isMonetary(s.mapping.value, s.domain.domain),
    };

    document.getElementById('view-landing').classList.add('hidden');
    document.getElementById('view-workflow').classList.add('hidden');
    document.getElementById('view-app').classList.remove('hidden');

    App.boot(normalized, s.mapping, schema, s.fileName);
  },
};

document.addEventListener('DOMContentLoaded', () => Flow.init());
