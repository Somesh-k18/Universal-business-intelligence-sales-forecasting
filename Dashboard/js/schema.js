
const Schema = {

  ROLE_KEYWORDS: {
    date:     ['date','dt','time','period','month','year','timestamp','day'],
    value:    ['revenue','sales','amount','price','salary','marks','score','expense',
                'payment','fee','cost','total','value','fare','bill','income','spend','budget'],
    category: ['category','type','subject','department','dept','paymentmode','payment_mode',
                'mode','class','genre','segment','plan'],
    group:    ['region','state','city','gender','branch','location','zone','area','country','division'],
    entity:   ['product','employee','name','student','patient','customer','item','emp',
                'client','user','staff','doctor','hospital'],
    id:       ['id','no','number','code','sno','uid']
  },

  DOMAIN_RULES: [
    { domain: 'Sales',      valueLabel: 'Revenue',  keywords: ['revenue','sales','order','product','discount'] },
    { domain: 'Retail',     valueLabel: 'Revenue',  keywords: ['sku','store','inventory','retail'] },
    { domain: 'Expense',    valueLabel: 'Expense',  keywords: ['expense','budget','spend','paymentmode','payment_mode'] },
    { domain: 'Employee',   valueLabel: 'Salary',   keywords: ['salary','employee','department','designation','experience'] },
    { domain: 'Education',  valueLabel: 'Marks',    keywords: ['marks','student','subject','grade','score','exam'] },
    { domain: 'Healthcare', valueLabel: 'Cost',     keywords: ['patient','disease','hospital','diagnosis','doctor','treatment'] },
    { domain: 'Banking',    valueLabel: 'Amount',   keywords: ['account','transaction','bank','balance','withdrawal','deposit'] },
    { domain: 'Marketing',  valueLabel: 'Spend',    keywords: ['campaign','impressions','clicks','ctr','roi','leads'] },
  ],

  MONEY_WORDS: ['revenue','sales','amount','price','salary','expense','payment','fee','cost',
                'total','value','fare','bill','income','spend','budget','balance','transaction'],

  normalize(name) { return String(name).toLowerCase().replace(/[_\-\s]+/g, ''); },

  /* Roughly parse a value as a number, stripping currency symbols/commas */
  looksNumeric(v) {
    if (v === '' || v === null || v === undefined) return false;
    if (typeof v === 'number') return isFinite(v);
    const s = String(v).trim().replace(/[₹$€,%\s]/g, '');
    if (s === '' || s === '-') return false;
    return !isNaN(Number(s));
  },

  looksDate(v) {
    if (v instanceof Date) return !isNaN(v.getTime());
    if (v === '' || v === null || v === undefined) return false;
    const s = String(v).trim();
    if (!/[-\/]/.test(s) && !/^[A-Za-z]{3,}\s+\d{1,2},?\s+\d{4}$/.test(s)) return false;
    const d = DataUtils.parseDate(s);
    return !isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100;
  },

  /* ── Analyze all columns: type + cardinality ─────────────── */
  profileColumns(rows, fields) {
    const sampleSize = Math.min(rows.length, 200);
    const sample = rows.slice(0, sampleSize);

    return fields.map(name => {
      const vals = sample.map(r => r[name]).filter(v => v !== '' && v !== null && v !== undefined);
      const nonEmpty = vals.length;
      let numCount = 0, dateCount = 0;
      vals.forEach(v => { if (Schema.looksNumeric(v)) numCount++; if (Schema.looksDate(v)) dateCount++; });

      const uniqueSet = new Set(rows.map(r => r[name]));
      const uniqueCount = uniqueSet.size;

      let type = 'text';
      if (nonEmpty > 0 && dateCount / nonEmpty > 0.7) type = 'date';
      else if (nonEmpty > 0 && numCount / nonEmpty > 0.7) type = 'numeric';
      else if (uniqueCount <= Math.max(20, rows.length * 0.5)) type = 'categorical';

      return {
        name, type,
        uniqueCount,
        nonEmptyRatio: rows.length ? nonEmpty / Math.min(rows.length, sampleSize) : 0,
        sample: [...uniqueSet].slice(0, 5),
      };
    });
  },

  scoreRole(colName, role) {
    const norm = Schema.normalize(colName);
    const kws = Schema.ROLE_KEYWORDS[role];
    let best = 0;
    kws.forEach(k => { if (norm.includes(k)) best = Math.max(best, k.length); });
    return best;
  },

  /* ── Suggest a full role→column mapping ──────────────────── */
  suggestMapping(profile) {
    const used = new Set();
    const pick = (role, typeFilter) => {
      let best = null, bestScore = 0;
      profile.forEach(col => {
        if (used.has(col.name)) return;
        if (typeFilter && !typeFilter.includes(col.type)) return;
        const score = Schema.scoreRole(col.name, role);
        if (score > bestScore) { bestScore = score; best = col; }
      });
      return { col: best, confident: bestScore > 0 };
    };

    const dateRes = pick('date', ['date']);
    if (dateRes.col) used.add(dateRes.col.name);

    let valueRes = pick('value', ['numeric']);
    if (!valueRes.col) {
      /* fallback: any numeric column not yet used */
      const anyNum = profile.find(c => c.type === 'numeric' && !used.has(c.name));
      valueRes = { col: anyNum || null, confident: false };
    }
    if (valueRes.col) used.add(valueRes.col.name);

    const categoryRes = pick('category', ['categorical']);
    if (categoryRes.col) used.add(categoryRes.col.name);

    const groupRes = pick('group', ['categorical']);
    if (groupRes.col) used.add(groupRes.col.name);

    let entityRes = pick('entity', ['categorical', 'text']);
    if (!entityRes.col) {
      /* fallback: high-cardinality categorical/text column */
      const cand = profile.find(c => !used.has(c.name) && (c.type === 'categorical' || c.type === 'text') && c.uniqueCount > 1);
      entityRes = { col: cand || null, confident: false };
    }
    if (entityRes.col) used.add(entityRes.col.name);

    return {
      date:     dateRes.col ? dateRes.col.name : null,
      value:    valueRes.col ? valueRes.col.name : null,
      category: categoryRes.col ? categoryRes.col.name : null,
      group:    groupRes.col ? groupRes.col.name : null,
      entity:   entityRes.col ? entityRes.col.name : null,
      confidence: {
        date: dateRes.confident, value: valueRes.confident, category: categoryRes.confident,
        group: groupRes.confident, entity: entityRes.confident,
      }
    };
  },

  detectDomain(fields) {
    const normFields = fields.map(f => Schema.normalize(f));
    let best = { domain: 'General', valueLabel: 'Value' }, bestScore = 0;
    Schema.DOMAIN_RULES.forEach(rule => {
      let score = 0;
      rule.keywords.forEach(k => { if (normFields.some(f => f.includes(k))) score++; });
      if (score > bestScore) { bestScore = score; best = rule; }
    });
    return best;
  },

  isMonetary(colName, domainLabel) {
    const norm = Schema.normalize(colName || '');
    if (Schema.MONEY_WORDS.some(w => norm.includes(w))) return true;
    return ['Sales','Retail','Expense','Employee','Banking','Marketing'].includes(domainLabel);
  },

  /* Candidate columns for a manual dropdown, filtered by acceptable types */
  candidatesFor(profile, types) {
    return profile.filter(c => types.includes(c.type));
  },
};
