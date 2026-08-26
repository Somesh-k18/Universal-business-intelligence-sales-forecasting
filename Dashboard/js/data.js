
const DataUtils = {


  parseCSVFile(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete(results) { resolve({ rows: results.data, fields: results.meta.fields || [] }); },
        error(err) { reject(err); }
      });
    });
  },

  parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
          const fields = rows.length ? Object.keys(rows[0]) : [];
          resolve({ rows, fields });
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  parseDate(val) {
    if (val === null || val === undefined || val === '') return new Date(NaN);
    if (val instanceof Date) return val;
    const str = String(val).trim();
    let m = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
    m = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
    const d = new Date(str);
    return d;
  },

  parseNumber(v) {
    if (typeof v === 'number') return v;
    if (v === '' || v === null || v === undefined) return NaN;
    const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
    return n;
  },

  formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B','KB','MB','GB'];
    let i = 0, v = bytes;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v < 10 && i > 0 ? 2 : 0)} ${units[i]}`;
  },

  fmt(date, pattern) {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = date.getDate(), m = date.getMonth(), y = date.getFullYear();
    const dd = String(d).padStart(2,'0'), mm = String(m+1).padStart(2,'0');
    return pattern.replace('MMM', MONTHS[m]).replace('MM', mm).replace('yyyy', y).replace('yy', String(y).slice(-2)).replace('dd', dd);
  },

  sortMonthEntries(arr, keyFn) {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return arr.sort((a, b) => {
      const [am, ay] = keyFn(a).split(' ');
      const [bm, by] = keyFn(b).split(' ');
      if (ay !== by) return parseInt(ay) - parseInt(by);
      return MONTHS.indexOf(am) - MONTHS.indexOf(bm);
    });
  },

  /* ═══════════════ VALIDATION (schema-agnostic) ═══════════════ */

  validate(rows, fields, profile) {
    const report = {
      totalRows: rows.length,
      totalColumns: fields.length,
      missingValues: 0,
      duplicateRows: 0,
      emptyRows: 0,
      hasNumericColumn: profile.some(c => c.type === 'numeric'),
      issues: [],
    };

    if (!report.hasNumericColumn) {
      report.issues.push('No numeric column detected — at least one numeric column is required to generate KPIs and charts.');
    }
    if (rows.length === 0) {
      report.issues.push('The file contains no data rows.');
    }

    const seen = new Set();
    rows.forEach(row => {
      const vals = fields.map(f => row[f]);
      const allEmpty = vals.every(v => v === '' || v === null || v === undefined);
      if (allEmpty) { report.emptyRows++; return; }
      const anyMissing = vals.some(v => v === '' || v === null || v === undefined);
      if (anyMissing) report.missingValues++;
      const key = JSON.stringify(vals);
      if (seen.has(key)) report.duplicateRows++;
      seen.add(key);
    });

    if (report.missingValues) report.issues.push(`${report.missingValues} row(s) have missing values`);
    if (report.duplicateRows) report.issues.push(`${report.duplicateRows} duplicate row(s) found`);
    if (report.emptyRows) report.issues.push(`${report.emptyRows} completely empty row(s) found`);

    return report;
  },

  /* ═══════════════ CLEANING (operates on raw string-ish rows, any fields) ═══════════════ */

  cleanRemoveDuplicates(rows, fields) {
    const seen = new Set(); const out = [];
    rows.forEach(r => {
      const key = fields.map(f => r[f]).join('|');
      if (!seen.has(key)) { seen.add(key); out.push(r); }
    });
    return { rows: out, count: rows.length - out.length };
  },

  cleanRemoveBlankRows(rows, fields) {
    const out = rows.filter(r => fields.some(f => r[f] !== '' && r[f] !== null && r[f] !== undefined));
    return { rows: out, count: rows.length - out.length };
  },

  cleanFillMissing(rows, fields, profile) {
    let count = 0;
    const typeMap = {}; profile.forEach(c => typeMap[c.name] = c.type);
    const out = rows.map(r => {
      const copy = { ...r };
      fields.forEach(f => {
        if (copy[f] === '' || copy[f] === null || copy[f] === undefined) {
          count++;
          if (typeMap[f] === 'numeric') copy[f] = 0;
          else if (typeMap[f] === 'date') copy[f] = '';
          else copy[f] = 'Unknown';
        }
      });
      return copy;
    });
    return { rows: out, count };
  },

  cleanNormalizeDates(rows, dateField) {
    let count = 0;
    if (!dateField) return { rows, count };
    const out = rows.map(r => {
      const d = DataUtils.parseDate(r[dateField]);
      if (isNaN(d.getTime())) return r;
      count++;
      const copy = { ...r };
      copy[dateField] = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
      return copy;
    });
    return { rows: out, count };
  },

  cleanStandardizeNumbers(rows, numericFields) {
    let count = 0;
    const out = rows.map(r => {
      const copy = { ...r };
      numericFields.forEach(f => {
        const before = copy[f];
        if (before === '' || before === null || before === undefined) return;
        const stripped = String(before).replace(/[^0-9.\-]/g, '');
        copy[f] = stripped;
        if (String(before) !== stripped) count++;
      });
      return copy;
    });
    return { rows: out, count };
  },

  cleanNormalizeText(rows, textFields) {
    let count = 0;
    const out = rows.map(r => {
      const copy = { ...r };
      textFields.forEach(f => {
        if (typeof copy[f] === 'string') {
          const trimmed = copy[f].trim().replace(/\s+/g, ' ');
          if (trimmed !== copy[f]) count++;
          copy[f] = trimmed;
        }
      });
      return copy;
    });
    return { rows: out, count };
  },

  cleanRemoveInvalid(rows, mapping) {
    const out = rows.filter(r => {
      if (mapping.value) { const n = DataUtils.parseNumber(r[mapping.value]); if (isNaN(n)) return false; }
      if (mapping.date)  { const d = DataUtils.parseDate(r[mapping.date]); if (isNaN(d.getTime())) return false; }
      return true;
    });
    return { rows: out, count: rows.length - out.length };
  },

  /* ═══════════════ SUMMARY ═══════════════ */

  computeSummary(rows, fields, profile, fileSizeBytes) {
    let missing = 0;
    const seen = new Set();
    let dup = 0;
    rows.forEach(r => {
      fields.forEach(f => { if (r[f] === '' || r[f] === null || r[f] === undefined) missing++; });
      const key = fields.map(f => r[f]).join('|');
      if (seen.has(key)) dup++; else seen.add(key);
    });
    const totalCells = rows.length * fields.length;
    const qualityScore = totalCells ? Math.max(0, Math.round(100 - (missing / totalCells * 100) - (dup / (rows.length || 1) * 20))) : 0;
    const memBytes = JSON.stringify(rows).length;
    return {
      totalRows: rows.length,
      totalColumns: fields.length,
      numericColumns: profile.filter(c => c.type === 'numeric').length,
      categoricalColumns: profile.filter(c => c.type === 'categorical').length,
      dateColumns: profile.filter(c => c.type === 'date').length,
      textColumns: profile.filter(c => c.type === 'text').length,
      memoryUsage: DataUtils.formatBytes(memBytes),
      fileSize: DataUtils.formatBytes(fileSizeBytes || memBytes),
      qualityScore,
      missingValues: missing,
      duplicateRecords: dup,
    };
  },

  /* ═══════════════ NORMALIZATION ═══════════════
     Turn schema-agnostic raw rows into a uniform shape the whole app can use:
     { __raw, __date, __value, __category, __group, __entity }              */
  normalize(rows, mapping) {
    return rows.map((r, i) => {
      const date = mapping.date ? DataUtils.parseDate(r[mapping.date]) : null;
      const value = mapping.value ? DataUtils.parseNumber(r[mapping.value]) : NaN;
      const category = mapping.category ? (String(r[mapping.category]).trim() || 'Uncategorized') : null;
      const group = mapping.group ? (String(r[mapping.group]).trim() || 'Unspecified') : null;
      const entity = mapping.entity ? (String(r[mapping.entity]).trim() || `Record ${i+1}`) : null;
      return { __raw: r, __date: date, __value: value, __category: category, __group: group, __entity: entity };
    }).filter(r => (!mapping.date || !isNaN(r.__date?.getTime())) && (!mapping.value || !isNaN(r.__value)));
  },

  /* ═══════════════ FILTER / AGGREGATE (generic) ═══════════════ */

  filterData(data, filters) {
    let out = data;
    if (filters.startDate) { const s = new Date(filters.startDate); out = out.filter(r => !r.__date || r.__date >= s); }
    if (filters.endDate)   { const e = new Date(filters.endDate + 'T23:59:59'); out = out.filter(r => !r.__date || r.__date <= e); }
    if (filters.category && filters.category !== 'All') out = out.filter(r => r.__category === filters.category);
    if (filters.group && filters.group !== 'All') out = out.filter(r => r.__group === filters.group);
    return out;
  },

  sum(data) { return data.reduce((s, r) => s + (isNaN(r.__value) ? 0 : r.__value), 0); },

  groupBy(data, key) {
    const m = new Map();
    data.forEach(r => { const k = r[key] ?? 'Unspecified'; m.set(k, (m.get(k) || 0) + (isNaN(r.__value) ? 0 : r.__value)); });
    return [...m.entries()].map(([label, total]) => ({ label, total }));
  },

  countBy(data, key) {
    const m = new Map();
    data.forEach(r => { const k = r[key] ?? 'Unspecified'; m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].map(([label, count]) => ({ label, count }));
  },

  groupByMonth(data) {
    const m = new Map();
    data.forEach(r => { if (!r.__date) return; const key = DataUtils.fmt(r.__date, 'MMM yyyy'); m.set(key, (m.get(key) || 0) + (isNaN(r.__value)?0:r.__value)); });
    return DataUtils.sortMonthEntries([...m.entries()].map(([Month, Total]) => ({ Month, Total })), x => x.Month);
  },

  groupByQuarter(data) {
    const m = new Map();
    data.forEach(r => { if (!r.__date) return; const q = `Q${Math.floor(r.__date.getMonth()/3)+1} ${r.__date.getFullYear()}`; m.set(q, (m.get(q)||0)+(isNaN(r.__value)?0:r.__value)); });
    return [...m.entries()].map(([Quarter, Total]) => ({ Quarter, Total })).sort((a,b) => a.Quarter.localeCompare(b.Quarter));
  },

  linearRegression(y) {
    const n = y.length;
    if (!n) return { slope: 0, intercept: 0 };
    let sx=0, sy=0, sxy=0, sx2=0;
    for (let i=0;i<n;i++) { sx+=i; sy+=y[i]; sxy+=i*y[i]; sx2+=i*i; }
    const denom = n*sx2 - sx*sx;
    const slope = denom ? (n*sxy - sx*sy)/denom : 0;
    const intercept = (sy - slope*sx)/n;
    return { slope, intercept };
  },

  /* Demo dataset — sales-flavored, but the app never assumes these exact names */
  generateMockData() {
    const regions    = ['North','South','East','West'];
    const categories = ['Electronics','Accessories','Office Equipment'];
    const products   = {
      Electronics:        ['Monitor','Smartphone','Laptop','Tablet'],
      Accessories:        ['Mouse','Keyboard','Headphones'],
      'Office Equipment': ['Printer','Scanner']
    };
    const rows = [];
    const now = new Date();
    for (let i = 0; i < 600; i++) {
      const cat = categories[Math.floor(Math.random()*categories.length)];
      const prods = products[cat];
      const prod = prods[Math.floor(Math.random()*prods.length)];
      const qty = Math.floor(Math.random()*5)+1;
      const price = Math.floor(Math.random()*1000)+20;
      const date = new Date(now.getTime() - Math.random()*365*2*24*60*60*1000);
      rows.push({
        OrderID: `ORD-${1000+i}`,
        Date: `${String(date.getDate()).padStart(2,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${date.getFullYear()}`,
        Product: prod, Category: cat,
        Region: regions[Math.floor(Math.random()*regions.length)],
        Quantity: qty, Price: price, Revenue: qty*price
      });
    }
    return { rows, fields: ['OrderID','Date','Product','Category','Region','Quantity','Price','Revenue'] };
  }
};
