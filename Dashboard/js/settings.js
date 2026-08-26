
Pages.settings = function () {
  const s = App.state.settings;
  const t = App.state.theme;
  const m = App.state.mapping;
  const sc2 = App.state.schema;

  const mapRows = [
    ['Value / Measure', m.value], ['Date', m.date], ['Category', m.category],
    ['Group / Region', m.group], ['Entity Name', m.entity],
  ];

  document.getElementById('page-content').innerHTML = `
<div class="page-inner">
  <div style="margin-bottom:24px">
    <div style="font-size:1.5rem;font-weight:800;margin-bottom:4px">Platform Settings</div>
    <div class="text-muted">Manage your workspace preferences and application settings.</div>
  </div>

  <div class="settings-grid">
    <div class="settings-main">

      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="var(--primary)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Appearance
          </div>
          <div class="card-desc">Customize how the dashboard looks.</div>
        </div>
        <div class="card-body">
          <div class="form-group">
            <div class="form-label">Theme Preference</div>
            <div class="theme-btn-group">
              <button class="theme-btn ${t==='light'?'active':''}" data-theme="light">Light</button>
              <button class="theme-btn ${t==='dark'?'active':''}" data-theme="dark">Dark</button>
              <button class="theme-btn ${t==='system'?'active':''}" data-theme="system">System</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="var(--primary)" stroke-width="2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            Data Preferences
          </div>
          <div class="card-desc">Format numbers, dates, and tables.</div>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div class="form-group">
              <label class="form-label" for="s-currency">Currency Symbol</label>
              <select id="s-currency" class="form-select">
                <option value="₹" ${s.currency==='₹'?'selected':''}>₹ (INR)</option>
                <option value="$" ${s.currency==='$'?'selected':''}>$ (USD)</option>
                <option value="€" ${s.currency==='€'?'selected':''}>€ (EUR)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="s-datefmt">Date Format</label>
              <select id="s-datefmt" class="form-select">
                <option value="DD-MM-YYYY" ${s.dateFormat==='DD-MM-YYYY'?'selected':''}>DD-MM-YYYY</option>
                <option value="MM-DD-YYYY" ${s.dateFormat==='MM-DD-YYYY'?'selected':''}>MM-DD-YYYY</option>
                <option value="YYYY-MM-DD" ${s.dateFormat==='YYYY-MM-DD'?'selected':''}>YYYY-MM-DD</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="s-ipp">Table Items Per Page</label>
              <select id="s-ipp" class="form-select">
                <option value="10" ${s.itemsPerPage===10?'selected':''}>10 Rows</option>
                <option value="25" ${s.itemsPerPage===25?'selected':''}>25 Rows</option>
                <option value="50" ${s.itemsPerPage===50?'selected':''}>50 Rows</option>
              </select>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <button id="s-reset" class="btn btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
            Reset Defaults
          </button>
          <button id="s-save" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save Changes
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Column Mapping</div>
          <div class="card-desc">How your dataset's columns are being used.</div>
        </div>
        <div class="card-body p0">
          <div class="table-wrap">
            <table>
              <thead><tr><th class="pl6">Role</th><th class="pl6">Mapped Column</th></tr></thead>
              <tbody>
                ${mapRows.map(([role,col]) => `<tr><td class="pl6" style="font-weight:600">${role}</td><td class="pl6">${col ? col : '<span class="text-muted">Not Available</span>'}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer">
          <div class="text-muted" style="font-size:0.8rem">To change the mapping, upload the dataset again from the landing page.</div>
        </div>
      </div>

    </div>

    <div>
      <div class="about-card">
        <div class="about-card-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          About App
        </div>
        <div class="about-row"><div class="about-row-label">Version</div><div class="about-row-value">2.0.0-universal</div></div>
        <div class="about-row"><div class="about-row-label">Data Source</div><div class="about-row-value" style="word-break:break-word">${App.state.sourceName || 'uploaded dataset'}</div></div>
        <div class="about-row"><div class="about-row-label">Developed by:</div><div class="about-row-value">Somesh Kailase <br> Pooja Chillore <br> Krushna Kalne
        </div></div>
        <div class="about-row"><div class="about-row-label">Total Records Loaded</div><div class="about-row-value big">${App.state.rawData.length.toLocaleString()}</div></div>
      </div>
    </div>
  </div>
</div>`;

  document.querySelectorAll('.theme-btn').forEach(btn => btn.addEventListener('click', () => {
    App.state.theme = btn.dataset.theme;
    localStorage.setItem('bi-theme', App.state.theme);
    App.applyTheme();
    App.destroyCharts();
    Pages.settings();
  }));

  document.getElementById('s-save').addEventListener('click', () => {
    App.state.settings.currency     = document.getElementById('s-currency').value;
    App.state.settings.dateFormat   = document.getElementById('s-datefmt').value;
    App.state.settings.itemsPerPage = parseInt(document.getElementById('s-ipp').value);
    App.saveSettings();
    App.toast('Settings saved', 'Your preferences have been updated successfully.');
  });

  document.getElementById('s-reset').addEventListener('click', () => {
    App.state.settings = { currency:'₹', dateFormat:'DD-MM-YYYY', itemsPerPage:10 };
    App.state.theme = 'light';
    localStorage.removeItem('bi-settings');
    localStorage.removeItem('bi-theme');
    App.applyTheme();
    App.toast('Settings reset', 'Restored to default values.');
    Pages.settings();
  });
};
