
const CHART_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

const NAV_ITEMS = [
  { page:'dashboard', label:'Dashboard', requires:null,
    icon:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  { page:'analytics', label:'Analytics', requires:null,
    icon:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' },
  { page:'breakdown', label:'Group Analysis', requires:'group',
    icon:'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
  { page:'records', label:'Records', requires:'entity',
    icon:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' },
  { page:'forecast', label:'Forecasting', requires:'date',
    icon:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
  { page:'insights', label:'AI Insights', requires:null,
    icon:'<path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3c1.8-1.2 3-3.3 3-5.7a7 7 0 0 0-7-7z"/><line x1="9" y1="21" x2="15" y2="21"/><line x1="10" y1="18" x2="14" y2="18"/>' },
  { page:'reports', label:'Reports', requires:null,
    icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>' },
  { page:'settings', label:'Settings', requires:null,
    icon:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' },
];

const App = {
  state: {
    rawData: [],        
    filteredData: [],
    sourceName: '',
    mapping: {},         
    schema: {},          
    loading: true,
    error: null,
    filters: { startDate:'', endDate:'', category:'All', group:'All' },
    settings: { currency:'₹', dateFormat:'DD-MM-YYYY', itemsPerPage:10 },
    theme: 'light',
    sidebarCollapsed: false,
    currentPage: 'dashboard',
    recordsState: { search:'', sortKey:'total', sortOrder:'desc', page:1 },
  },

  charts: {},

  formatCurrency(val) {
    const c = App.state.settings.currency;
    const code = c === '₹' ? 'INR' : c === '$' ? 'USD' : 'EUR';
    return new Intl.NumberFormat('en-IN', { style:'currency', currency: code, maximumFractionDigits:0 }).format(val || 0);
  },
  formatCompact(val) {
    const c = App.state.schema.isMonetary ? App.state.settings.currency : '';
    val = val || 0;
    const sign = val < 0 ? '-' : ''; val = Math.abs(val);
    if (val >= 1e6) return `${sign}${c}${(val/1e6).toFixed(2)}M`;
    if (val >= 1e3) return `${sign}${c}${(val/1e3).toFixed(2)}K`;
    return `${sign}${c}${val.toFixed(c ? 2 : 0)}`;
  },

  formatValue(val) {
    return App.state.schema.isMonetary ? App.formatCurrency(val) : Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  },


  loadSettings() {
    try {
      const s = localStorage.getItem('bi-settings');
      if (s) App.state.settings = { ...App.state.settings, ...JSON.parse(s) };
      App.state.theme = localStorage.getItem('bi-theme') || 'light';
    } catch(e) {}
  },
  saveSettings() { localStorage.setItem('bi-settings', JSON.stringify(App.state.settings)); },


  applyTheme() {
    const root = document.documentElement;
    root.classList.remove('light','dark');
    if (App.state.theme === 'system') {
      root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
      root.classList.add(App.state.theme);
    }
    const icon = document.getElementById('theme-icon');
    if (icon) {
      icon.outerHTML = App.state.theme === 'dark'
        ? `<svg id="theme-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg id="theme-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
    const isDark = root.classList.contains('dark');
    Chart.defaults.color = isDark ? '#8a9ab8' : '#6b7a96';
    Chart.defaults.borderColor = isDark ? '#2a3a52' : '#dce3ee';
  },

  chartDefaults() {
    const isDark = document.documentElement.classList.contains('dark');
    return {
      gridColor:    isDark ? '#2a3a52' : '#dce3ee',
      labelColor:   isDark ? '#8a9ab8' : '#6b7a96',
      tooltipBg:    isDark ? '#1e293b' : '#ffffff',
      tooltipBorder:isDark ? '#2a3a52' : '#dce3ee',
    };
  },


  destroyCharts() {
    Object.values(App.charts).forEach(c => { try { c.destroy(); } catch(e){} });
    App.charts = {};
  },

  createChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    if (App.charts[id]) { try { App.charts[id].destroy(); } catch(e){} }
    const chart = new Chart(canvas, config);
    App.charts[id] = chart;
    return chart;
  },

  commonTooltip() {
    const d = App.chartDefaults();
    return {
      backgroundColor: d.tooltipBg, borderColor: d.tooltipBorder, borderWidth: 1,
      titleColor: document.documentElement.classList.contains('dark') ? '#f0f4ff' : '#0f1a2e',
      bodyColor:  document.documentElement.classList.contains('dark') ? '#8a9ab8' : '#6b7a96',
      padding: 12, cornerRadius: 8, boxPadding: 4,
    };
  },

  commonScales() {
    const d = App.chartDefaults();
    return {
      x: { grid: { display: false }, ticks: { color: d.labelColor, font: { size: 11 } }, border: { color: d.gridColor } },
      y: { grid: { color: d.gridColor }, ticks: { color: d.labelColor, font: { size: 11 }, callback: v => App.formatCompact(v) }, border: { display: false } }
    };
  },


  startClock() {
    const el = document.getElementById('clock');
    const tick = () => { if (el) el.textContent = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true }); };
    tick(); setInterval(tick, 1000);
  },


  buildNav() {
    const s = App.state.schema;
    const has = { date: !!App.state.mapping.date, group: !!App.state.mapping.group, entity: !!App.state.mapping.entity };
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = NAV_ITEMS.filter(item => !item.requires || has[item.requires]).map((item,i) => `
      <a class="nav-item ${i===0?'active':''}" data-page="${item.page}" href="#">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${item.icon}</svg>
        <span>${item.label}</span>
      </a>`).join('');
    nav.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', e => { e.preventDefault(); App.navigate(el.dataset.page); }));
  },

  navigate(page) {
    App.state.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    const titles = { dashboard:'Dashboard', analytics:'Analytics', breakdown:`${App.state.schema.groupLabel || 'Group'} Analysis`, records:'Records', forecast:'Forecasting', insights:'AI Business Insights', reports:'Reports', settings:'Settings' };
    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
    App.destroyCharts();
    App.renderPage(page);
    document.getElementById('sidebar').classList.remove('mobile-open');
  },

  renderPage(page) {
    const el = document.getElementById('page-content');
    if (App.state.loading) { el.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Parsing data…</span></div>`; return; }
    if (App.state.error) { el.innerHTML = `<div class="error-state"><p style="font-size:1.1rem;font-weight:700">Error Loading Data</p><p>${App.state.error}</p></div>`; return; }
    const map = { dashboard: Pages.dashboard, analytics: Pages.analytics, breakdown: Pages.breakdown, records: Pages.records, forecast: Pages.forecast, insights: Pages.insights, reports: Pages.reports, settings: Pages.settings };
    (map[page] || Pages.dashboard)();
  },

  applyFilters() {
    App.state.filteredData = DataUtils.filterData(App.state.rawData, App.state.filters);
    App.destroyCharts();
    App.renderPage(App.state.currentPage);
  },

 
  toast(title, desc='') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div class="toast-title">${title}</div>${desc ? `<div class="toast-desc">${desc}</div>` : ''}`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity 0.3s'; setTimeout(() => el.remove(), 350); }, 2500);
  },

  openModal(title, bodyHTML, afterOpen) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-overlay').classList.remove('hidden');
    if (afterOpen) afterOpen();
  },
  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    ['modal-trend-chart','modal-group-chart'].forEach(id => {
      if (App.charts[id]) { try { App.charts[id].destroy(); } catch(e){} delete App.charts[id]; }
    });
  },


  boot(data, mapping, schema, sourceName) {
    App.loadSettings();
    App.applyTheme();
    App.startClock();
    App.state.mapping = mapping;
    App.state.schema = schema;
    App.bindEvents();
    App.buildNav();

    App.state.rawData = data;
    App.state.sourceName = sourceName || 'uploaded dataset';


    const filterDateWrap = document.getElementById('filter-date-wrap');
    const filterEndWrap = document.getElementById('filter-end-wrap');
    if (mapping.date && data.length > 0) {
      let minD = data[0].__date, maxD = data[0].__date;
      data.forEach(r => { if (r.__date < minD) minD = r.__date; if (r.__date > maxD) maxD = r.__date; });
      App.state.filters.startDate = minD.toISOString().split('T')[0];
      App.state.filters.endDate   = maxD.toISOString().split('T')[0];
      document.getElementById('filter-start').value = App.state.filters.startDate;
      document.getElementById('filter-end').value   = App.state.filters.endDate;
      filterDateWrap.classList.remove('hidden');
      filterEndWrap.classList.remove('hidden');
    } else { filterDateWrap.classList.add('hidden'); filterEndWrap.classList.add('hidden'); }

  
    const catWrap = document.getElementById('filter-category-wrap');
    if (mapping.category) {
      const cats = [...new Set(data.map(r => r.__category))].sort();
      document.getElementById('filter-category-label').textContent = schema.categoryLabel || 'Category';
      document.getElementById('filter-category').innerHTML = `<option value="All">All ${schema.categoryLabel || 'Categories'}</option>` + cats.map(c=>`<option value="${c}">${c}</option>`).join('');
      catWrap.classList.remove('hidden');
    } else { catWrap.classList.add('hidden'); }

  
    const grpWrap = document.getElementById('filter-group-wrap');
    if (mapping.group) {
      const grps = [...new Set(data.map(r => r.__group))].sort();
      document.getElementById('filter-group-label').textContent = schema.groupLabel || 'Group';
      document.getElementById('filter-group').innerHTML = `<option value="All">All ${schema.groupLabel || 'Groups'}</option>` + grps.map(g=>`<option value="${g}">${g}</option>`).join('');
      grpWrap.classList.remove('hidden');
    } else { grpWrap.classList.add('hidden'); }

    App.state.filteredData = DataUtils.filterData(data, App.state.filters);
    App.state.loading = false;
    App.navigate('dashboard');
    App.toast('Dashboard ready', `Analyzed ${data.length.toLocaleString()} records from ${App.state.sourceName} — detected as a ${schema.domain} dataset.`);
  },

  bindEvents() {
    document.getElementById('collapse-btn').addEventListener('click', () => {
      App.state.sidebarCollapsed = !App.state.sidebarCollapsed;
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('collapsed', App.state.sidebarCollapsed);
      const icon = document.getElementById('collapse-icon');
      icon.innerHTML = App.state.sidebarCollapsed ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>';
    });

    document.getElementById('mobile-menu-btn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('mobile-open'));

    document.getElementById('theme-toggle').addEventListener('click', () => {
      App.state.theme = App.state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('bi-theme', App.state.theme);
      App.applyTheme();
      App.destroyCharts();
      App.renderPage(App.state.currentPage);
    });

    document.getElementById('export-print').addEventListener('click', () => window.print());

    document.getElementById('new-upload-btn').addEventListener('click', () => {
      if (!confirm('Start over with a new dataset? Current dashboard data will be cleared.')) return;
      location.reload();
    });

    document.getElementById('filter-apply').addEventListener('click', () => {
      App.state.filters.startDate = document.getElementById('filter-start').value;
      App.state.filters.endDate   = document.getElementById('filter-end').value;
      App.state.filters.category  = document.getElementById('filter-category').value;
      App.state.filters.group     = document.getElementById('filter-group').value;
      App.applyFilters();
    });

    document.getElementById('filter-reset').addEventListener('click', () => {
      const data = App.state.rawData;
      const f = { startDate:'', endDate:'', category:'All', group:'All' };
      if (App.state.mapping.date && data.length > 0) {
        let minD = data[0].__date, maxD = data[0].__date;
        data.forEach(r => { if (r.__date < minD) minD = r.__date; if (r.__date > maxD) maxD = r.__date; });
        f.startDate = minD.toISOString().split('T')[0]; f.endDate = maxD.toISOString().split('T')[0];
      }
      App.state.filters = f;
      document.getElementById('filter-start').value    = f.startDate;
      document.getElementById('filter-end').value      = f.endDate;
      document.getElementById('filter-category').value = 'All';
      document.getElementById('filter-group').value    = 'All';
      App.applyFilters();
    });

    document.getElementById('modal-close').addEventListener('click', App.closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('modal-overlay')) App.closeModal(); });
  }
};

const Pages = {};
