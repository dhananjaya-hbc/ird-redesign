/* Sinhala / Tamil translation engine.
   - Translates every visible string, including content the app renders later (a MutationObserver watches the page).
   - Elements with only inline markup (<strong>, <a>, <abbr>…) are translated as a whole sentence, so word order can change.
   - Amounts, dates, numbers and icons are swapped for {0}, {1}… placeholders, so one entry covers every value.
   - Dictionary: window.I18N_DICT = { si: { 'English': 'සිංහල' }, ta: { … } } (i18n-dict.js).
   - Anything inside [data-no-i18n] stays in English (bank-app values, the case-study page). */
(() => {
  'use strict';
  const DICT = window.I18N_DICT || { si: {}, ta: {} };
  let lang = 'en';
  let collect = null; // Set of missing keys while auditing coverage

  const MONTHS = {
    si: ['ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'],
    ta: ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'],
  };
  const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const DATE = /^(\d{1,2}) ([A-Za-z]{3,9}) (\d{4})$/;
  // Icons, amounts, dates, then any other number (TINs, years, codes, counts).
  // Opening tags with attributes are placeholders too, so translations keep links, classes and tooltips intact.
  const TOKEN = /<svg[\s\S]*?<\/svg>|<[a-zA-Z]+\s[^>]*>|Rs\. [\d,]+(?:\.\d+)?|\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b|\bin \d+ days\b|\b\d+ days ago\b|\d[\d,./:]*\d|\d/g;

  const norm = s => s.replace(/\s+/g, ' ').trim();
  function tokenize(s) {
    const toks = [];
    return { key: s.replace(TOKEN, m => `{${toks.push(m) - 1}}`), toks };
  }
  const REL = {
    si: [n => `දින ${n}කින්`, n => `දින ${n}කට පෙර`],
    ta: [n => `${n} நாட்களில்`, n => `${n} நாட்களுக்கு முன்`],
  };
  function localize(tok) {
    let r = tok.match(/^in (\d+) days$/);
    if (r && REL[lang]) return REL[lang][0](r[1]);
    r = tok.match(/^(\d+) days ago$/);
    if (r && REL[lang]) return REL[lang][1](r[1]);
    const m = tok.match(DATE);
    if (!m || !MONTHS[lang]) return tok;
    const mi = MON.indexOf(m[2].slice(0, 3).toLowerCase());
    if (mi < 0) return tok;
    return lang === 'si' ? `${m[3]} ${MONTHS.si[mi]} ${m[1]}` : `${m[1]} ${MONTHS.ta[mi]} ${m[3]}`;
  }
  function lookup(english) {
    const { key, toks } = tokenize(norm(english));
    if (key === '{0}') { const l = localize(toks[0]); return l !== toks[0] ? l : null; } // a lone date or "in 7 days"
    if (!/[A-Za-z]/.test(key.replace(/\{\d+\}/g, '').replace(/<[^>]*>/g, ''))) return null; // nothing to translate
    const t = (DICT[lang] || {})[key];
    if (t == null) { if (collect) collect.add(key); return null; }
    return t.replace(/\{(\d+)\}/g, (_, i) => localize(toks[i] ?? ''));
  }

  const INLINE = new Set(['STRONG', 'EM', 'B', 'I', 'ABBR', 'A', 'CODE', 'BR', 'SMALL', 'SPAN', 'svg', 'use', 'SVG', 'USE', 'KBD', 'SUP']);
  const SKIP = new Set(['SCRIPT', 'STYLE', 'CODE', 'TEXTAREA', 'NOSCRIPT']);
  const textState = new WeakMap(), htmlState = new WeakMap(), attrState = new WeakMap();

  // A "sentence" mixes its own words with inline tags, e.g. "Due by <strong>15 Nov</strong> (in 7 days)."
  function isSentence(el) {
    if (!el.firstElementChild || !norm(el.textContent)) return false;
    if (![...el.childNodes].some(n => n.nodeType === 3 && /[A-Za-z]/.test(n.data))) return false;
    for (const d of el.querySelectorAll('*')) {
      if (!INLINE.has(d.tagName) || d.id || d.matches('input,select,button,textarea')) return false;
    }
    return true;
  }

  function doText(n) {
    const raw = n.data;
    if (!raw.trim()) return;
    let st = textState.get(n);
    if (!st || raw !== st.out) st = { orig: raw, out: null };
    if (lang === 'en') { if (st.out !== null && raw === st.out) n.data = st.orig; textState.delete(n); return; }
    const t = lookup(st.orig);
    if (t == null) return;
    const out = st.orig.match(/^\s*/)[0] + t + st.orig.match(/\s*$/)[0];
    st.out = out; textState.set(n, st);
    if (n.data !== out) n.data = out;
  }

  function doAttrs(el) {
    for (const a of ['placeholder', 'aria-label', 'alt', 'title']) {
      if (!el.hasAttribute(a)) continue;
      const map = attrState.get(el) || {};
      const cur = el.getAttribute(a);
      let st = map[a];
      if (!st || cur !== st.out) st = { orig: cur, out: null };
      if (lang === 'en') { if (st.out !== null && cur === st.out) el.setAttribute(a, st.orig); delete map[a]; attrState.set(el, map); continue; }
      const t = lookup(st.orig);
      if (t == null) continue;
      st.out = t; map[a] = st; attrState.set(el, map);
      if (cur !== t) el.setAttribute(a, t);
    }
  }

  function walk(node) {
    if (node.nodeType === 3) { if (!node.parentElement || !node.parentElement.closest('[data-no-i18n]')) doText(node); return; }
    if (node.nodeType !== 1) return;
    const el = node;
    if (SKIP.has(el.tagName) || el.closest('[data-no-i18n]')) return;
    doAttrs(el);
    if (isSentence(el)) {
      const cur = el.innerHTML;
      let st = htmlState.get(el);
      if (!st || cur !== st.out) st = { orig: cur, out: null };
      if (lang === 'en') { if (st.out !== null && cur === st.out) el.innerHTML = st.orig; htmlState.delete(el); return; }
      const t = lookup(st.orig);
      if (t != null) { st.out = t; htmlState.set(el, st); if (cur !== t) el.innerHTML = t; afterHtml(el); return; }
      if (collect) return; // record the whole sentence, not its fragments
    }
    for (const c of [...el.childNodes]) walk(c);
  }
  function afterHtml(el) {
    // Tooltips are bound to <abbr> elements; re-bind any that were re-created.
    if (window.IRD && el.querySelector('abbr[data-term]')) window.IRD.bindTerms(el);
  }

  const observer = new MutationObserver(muts => {
    if (lang === 'en' && !collect) return;
    observer.disconnect();
    for (const m of muts) walk(m.type === 'characterData' ? m.target : m.target);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });

  function apply(next) {
    lang = next;
    document.documentElement.lang = next;
    observer.disconnect();
    walk(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.I18N = {
    apply,
    get lang() { return lang; },
    // Coverage audit: switch to an empty language and record every string that would need a translation.
    startAudit(code = 'xx') { collect = new Set(); if (!DICT[code]) DICT[code] = {}; apply(code); },
    auditResult() { return collect ? [...collect] : []; },
  };
})();
