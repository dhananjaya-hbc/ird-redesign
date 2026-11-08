/* IRD redesign concept — plain JS, no build step. */
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Data. VERIFY all figures against current IRD publications before relying on them.
  // ---------------------------------------------------------------------------

  // Personal relief + progressive slabs, keyed by the first calendar year of the Y/A.
  // A Y/A uses the latest table whose key <= its start year.
  const TAX_TABLES = {
    2023: { relief: 1_200_000, slabs: [[500_000, .06], [500_000, .12], [500_000, .18], [500_000, .24], [500_000, .30], [Infinity, .36]] },
    2025: { relief: 1_800_000, slabs: [[1_000_000, .06], [500_000, .18], [500_000, .24], [500_000, .30], [Infinity, .36]] },
  };

  const GLOSSARY = {
    'TIN': 'Taxpayer Identification Number. Your 9-digit personal tax number from IRD. You need it for every payment.',
    'PIN': 'A password-like number IRD sends you so you can log in to e-Services online.',
    'APIT': 'Advance Personal Income Tax. Tax your employer takes from your salary each month and pays to IRD for you.',
    'Y/A': 'Year of assessment. The tax year, from 1 April to 31 March. "2025/26" means 1 Apr 2025 – 31 Mar 2026.',
    'Instalment': 'A part-payment of your yearly tax. If you have income with no tax deducted, you pay in 4 quarterly instalments.',
    'Self-assessment': 'You work out and pay your own tax, then confirm it in your tax return. IRD may check it later.',
    'Period code': 'A short number that tells IRD which year and quarter a payment is for, e.g. 25262 = 2nd instalment of 2025/26.',
    'Tax type': 'Which tax you are paying (e.g. Income Tax, VAT). Banks show this as a menu or a code.',
    'Paying-in slip': 'A form you take to the bank counter with your TIN, tax type, period and amount. Also called a payment voucher.',
    'CEFTS / OTPP': 'LankaPay’s instant bank transfer system. IRD’s Online Tax Payment Platform uses it so you can pay 24/7 from your bank app.',
    'e-Services / RAMIS': 'IRD’s online portal (RAMIS is the system behind it). Log in to pay, file returns and see your payment history.',
    'Tax return': 'A yearly form where you declare all your income and reliefs. The final tax for the year is worked out from it.',
    'Payment type': 'Whether you are paying tax you worked out yourself (self assessment) or tax IRD has assessed and sent you a notice for.',
    'DIN': 'Document Identification Number. It is printed on an assessment notice from IRD. You only need it when paying that notice.',
  };

  // Interface text in Sinhala and Tamil (login page and navigation). Have a native speaker review before launch.
  const I18N = {
    si: {
      'nav.pay': 'බදු ගෙවන්න', 'nav.tin': 'TIN ලබාගන්න', 'nav.pin': 'PIN ලබාගන්න', 'nav.verify': 'තහවුරු කරන්න', 'nav.help': 'උදව්',
      'login.h1': 'ඇතුල් වන්න', 'login.lead': 'බදු ගෙවන්න, ආදායම් වාර්තාව ඉදිරිපත් කරන්න, ඔබ ගෙවූ සියල්ල එකම තැනකින් බලන්න.',
      'login.tin': 'ඔබගේ TIN අංකය', 'login.where': 'මගේ TIN අංකය සොයාගන්නේ කොහෙන්ද?', 'login.pin': 'ඔබගේ PIN අංකය',
      'login.forgot': 'PIN අංකය අමතකද?', 'login.show': 'පෙන්වන්න', 'login.btn': 'ඇතුල් වන්න',
      'login.secure': 'ආරක්ෂිත ඇතුල්වීම · රූප ප්‍රහේලිකා නැත · ඕනෑම බ්‍රව්සරයක්',
      'login.other': 'ව්‍යාපාරයක්, සේවාදායකයෙකු හෝ බදු නියෝජිතයෙකු ලෙස ඇතුල් වනවාද?',
      'side.h': 'ඇතුල් වීම අවශ්‍ය නැත', 'side.help': 'ආදායම් බදු, නියමිත දින සහ බදු වචන පිළිබඳ උදව්',
      'svc.check': 'මට ආදායම් බදු ගෙවීමට සිදුවේද?', 'svc.check.d': 'ප්‍රශ්න 3යි. ඔබගේ මුදල් සහ නියමිත දින ලබාගන්න.',
      'svc.pay': 'බදු ගෙවන්න', 'svc.pay.d': 'ඔබගේ බැංකුව ඉල්ලන සියලු විස්තර, පුරවා ඇත.',
      'svc.tin': 'TIN ලබාගන්න', 'svc.tin.d': 'නොමිලේ, විනාඩි 10ක් පමණ. PIN අංකයද සමඟම ලැබේ.',
      'svc.pin': 'PIN ලබාගන්න හෝ යළි සකසන්න', 'svc.pin.d': 'විනාඩි කිහිපයකින් ඊමේල් හෝ SMS මගින්.',
      'svc.verify': 'සහතිකයක් තහවුරු කරන්න', 'svc.verify.d': 'IRD ලියාපදිංචියක් හෝ සහතිකයක් සත්‍ය දැයි බලන්න.',
    },
    ta: {
      'nav.pay': 'வரி செலுத்துக', 'nav.tin': 'TIN பெறுக', 'nav.pin': 'PIN பெறுக', 'nav.verify': 'சரிபார்க்க', 'nav.help': 'உதவி',
      'login.h1': 'உள்நுழைக', 'login.lead': 'வரி செலுத்துங்கள், வருமான அறிக்கையைச் சமர்ப்பியுங்கள், நீங்கள் செலுத்திய அனைத்தையும் ஒரே இடத்தில் பாருங்கள்.',
      'login.tin': 'உங்கள் TIN இலக்கம்', 'login.where': 'எனது TIN இலக்கத்தை எங்கே காணலாம்?', 'login.pin': 'உங்கள் PIN இலக்கம்',
      'login.forgot': 'PIN இலக்கத்தை மறந்துவிட்டீர்களா?', 'login.show': 'காட்டு', 'login.btn': 'உள்நுழைக',
      'login.secure': 'பாதுகாப்பான உள்நுழைவு · பட புதிர்கள் இல்லை · எந்த உலாவியிலும்',
      'login.other': 'வணிகம், வாடிக்கையாளர் அல்லது வரி முகவராக உள்நுழைகிறீர்களா?',
      'side.h': 'உள்நுழைவு தேவையில்லை', 'side.help': 'வருமான வரி, காலக்கெடு மற்றும் வரிச் சொற்கள் பற்றிய உதவி',
      'svc.check': 'நான் வருமான வரி செலுத்த வேண்டுமா?', 'svc.check.d': '3 கேள்விகள். உங்கள் தொகைகளையும் காலக்கெடுகளையும் பெறுங்கள்.',
      'svc.pay': 'வரி செலுத்துக', 'svc.pay.d': 'உங்கள் வங்கி கேட்கும் அனைத்து விவரங்களும் நிரப்பப்பட்டுள்ளன.',
      'svc.tin': 'TIN பெறுக', 'svc.tin.d': 'இலவசம், சுமார் 10 நிமிடங்கள். PIN இலக்கமும் உடன் வரும்.',
      'svc.pin': 'PIN பெறுக அல்லது மீட்டமைக்க', 'svc.pin.d': 'சில நிமிடங்களில் மின்னஞ்சல் அல்லது SMS மூலம்.',
      'svc.verify': 'சான்றிதழைச் சரிபார்க்க', 'svc.verify.d': 'IRD பதிவு அல்லது சான்றிதழ் உண்மையானதா எனப் பாருங்கள்.',
    },
  };

  const BANKS = ['Bank of Ceylon', "People's Bank", 'Commercial Bank', 'Hatton National Bank', 'Sampath Bank',
    'Seylan Bank', 'NDB Bank', 'DFCC Bank', 'Nations Trust Bank', 'Pan Asia Bank', 'Union Bank',
    'Amana Bank', 'Cargills Bank', 'HSBC', 'Standard Chartered', 'Other bank'];

  const SEARCH_INDEX = [
    { href: '#check', title: 'Do I need to pay income tax?', words: 'need do i have to pay owe salary employee freelance check plan how much' },
    { href: '#help', title: 'Help with income tax', words: 'help guide how' },
    { href: '#verify', title: 'Verify a certificate', words: 'verify certificate check real registration' },
    { href: '#compare', title: 'Why this redesign (before vs after)', words: 'why redesign compare before after youtube' },
    { href: '#pay', title: 'Pay income tax', words: 'pay payment instalment quarterly bank online slip voucher balance' },
    { href: '#estimate', title: 'Work out what I owe', words: 'calculate calculator estimate how much owe rate slab relief apit salary' },
    { href: '#register', title: 'Get a TIN', words: 'tin register registration number new pin login account' },
    { href: '#file', title: 'File my tax return', words: 'file return submit declaration annual' },
    { href: '#deadlines', title: 'Income tax due dates', words: 'due date deadline when calendar late' },
    { href: '#glossary', title: 'Tax words explained', words: 'meaning glossary what is apit tin y/a period code ramis cefts' },
  ];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ic = (n, c = 'i') => `<svg class="${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const rs = n => 'Rs. ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = v => { const n = parseFloat(String(v).replace(/[^\d.]/g, '')); return isFinite(n) ? n : 0; };
  const fmtDate = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const DAY = 86_400_000;
  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

  // Y/A starting year that contains a date (Y/A runs 1 Apr – 31 Mar).
  const yoaStartOf = d => d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const yoaLabel = y => `${y}/${String(y + 1).slice(2)}`;
  const yoaCode = y => `${String(y).slice(2)}${String(y + 1).slice(2)}`;

  const instalmentDates = y => [
    new Date(y, 7, 15), new Date(y, 10, 15), new Date(y + 1, 1, 15), new Date(y + 1, 4, 15),
  ];
  const returnDue = y => new Date(y + 1, 10, 30);   // 30 Nov after Y/A ends
  const finalPayDue = y => new Date(y + 1, 8, 30);  // 30 Sep after Y/A ends (VERIFY)

  function tableFor(y) {
    const key = Math.max(...Object.keys(TAX_TABLES).map(Number).filter(k => k <= y));
    return TAX_TABLES[key] || TAX_TABLES[Math.min(...Object.keys(TAX_TABLES).map(Number))];
  }

  function computeTax(income, y) {
    const { relief, slabs } = tableFor(y);
    let taxable = Math.max(0, income - relief);
    const rows = [];
    let total = 0;
    for (const [size, rate] of slabs) {
      if (taxable <= 0) break;
      const part = Math.min(size, taxable);
      const tax = part * rate;
      rows.push({ part, rate, tax });
      total += tax;
      taxable -= part;
    }
    return { relief, taxable: Math.max(0, income - relief), rows, total };
  }

  function allDeadlines() {
    const cur = yoaStartOf(today);
    const out = [];
    for (const y of [cur - 1, cur]) {
      instalmentDates(y).forEach((d, i) => out.push({ date: d, title: `Income tax instalment ${i + 1} of 4`, sub: `Y/A ${yoaLabel(y)}`, href: '#pay' }));
      out.push({ date: finalPayDue(y), title: 'Pay final balance', sub: `Y/A ${yoaLabel(y)}`, href: '#pay' });
      out.push({ date: returnDue(y), title: 'File your income tax return', sub: `Y/A ${yoaLabel(y)}`, href: '#file' });
    }
    return out.sort((a, b) => a.date - b.date)
      .filter(d => d.date >= new Date(today.getTime() - 120 * DAY) && d.date <= new Date(today.getTime() + 400 * DAY));
  }

  const daysUntil = d => Math.round((d - today) / DAY);
  const inDays = n => n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 0 ? `in ${n} days` : `${-n} days ago`;

  // ---------------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------------
  function route() {
    let [name, query = ''] = (location.hash.slice(1) || 'login').split('?');
    if (name === 'home') name = 'login'; // the e-Services login is the front door
    const params = new URLSearchParams(query);
    if (name === 'check' && params.get('m')) prefillCheck(Number(params.get('m')));
    let view = $(`.view[data-view="${name}"]`) ? name : 'login';
    const portal = window.IRD_PORTAL;
    const redirect = portal && portal.guard(view);
    if (redirect) { location.replace('#' + redirect); return; }
    $$('.view').forEach(v => { v.hidden = v.dataset.view !== view; });
    $$('.nav a').forEach(a => a.getAttribute('href') === '#' + view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    document.title = $(`.view[data-view="${view}"] h1`).textContent + ' · IRD e-Services (concept)';
    window.scrollTo(0, 0);
    if (view !== 'login') $('#main').focus({ preventScroll: true });
    if (portal) portal.onView(view);
  }
  window.addEventListener('hashchange', route);

  // ---------------------------------------------------------------------------
  // Home: search + next deadline
  // ---------------------------------------------------------------------------
  function renderSearch(q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = $('#search-results');
    if (!terms.length) { out.innerHTML = ''; return []; }
    const hits = SEARCH_INDEX
      .map(item => ({ item, score: terms.filter(t => (item.title + ' ' + item.words).toLowerCase().includes(t)).length }))
      .filter(h => h.score > 0).sort((a, b) => b.score - a.score).map(h => h.item);

    // A number in the query is treated as a monthly income, e.g. "salary 250000", "I earn 3.5 lakhs".
    const m = q.toLowerCase().replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(lakhs?|lks?|k|m|mn)?/);
    if (m) {
      const mult = { lakh: 1e5, lakhs: 1e5, lk: 1e5, lks: 1e5, k: 1e3, m: 1e6, mn: 1e6 }[m[2]] || 1;
      const monthly = Math.round(parseFloat(m[1]) * mult);
      if (monthly >= 1000) hits.unshift({ href: `#check?m=${monthly}`, title: `Do I pay tax on ${rs(monthly).replace('.00', '')} a month? See the answer`, icon: 'calc' });
    }
    // Deadline questions are answered right in the results.
    if (/when|due|deadline|date|last day/.test(q.toLowerCase())) {
      const next = allDeadlines().find(d => d.date >= today);
      if (next) hits.unshift({ href: '#deadlines', title: `Next: ${next.title} (${next.sub}), ${fmtDate(next.date)}, ${inDays(daysUntil(next.date))}`, icon: 'calendar' });
    }
    out.innerHTML = hits.length
      ? hits.map(h => `<li><a href="${h.href}">${ic(h.icon || 'arrow')}<span>${h.title}</span>${ic('chevron', 'i sr-chev')}</a></li>`).join('')
      : `<li><a href="#glossary">${ic('book')}<span>No exact match. Browse tax words explained</span>${ic('chevron', 'i sr-chev')}</a></li>`;
    return hits;
  }
  $('#q').addEventListener('input', e => renderSearch(e.target.value));
  $('#task-search').addEventListener('submit', e => {
    e.preventDefault();
    const hits = renderSearch($('#q').value);
    if (hits[0]) location.hash = hits[0].href;
  });

  function renderNextDeadline() {
    const next = allDeadlines().find(d => d.date >= today);
    if (!next) return;
    const n = daysUntil(next.date);
    $('#next-deadline').innerHTML =
      `<span class="tile tile-warn">${ic('clock')}</span><div><span class="eyebrow">Next due date · ${inDays(n)}</span><strong>${next.title} (${next.sub})</strong><span class="muted">${fmtDate(next.date)}</span></div>` +
      `<a class="btn btn-secondary" href="${next.href}">${next.href === '#file' ? 'File now' : 'Pay now'}</a>`;
    const cur = yoaStartOf(today);
    const rd = returnDue(cur - 1) >= today ? cur - 1 : cur;
    $('#return-due-meta').textContent = `Y/A ${yoaLabel(rd)} due ${fmtDate(returnDue(rd))}`;
    $('#file-due').innerHTML = `<strong>Y/A ${yoaLabel(rd)} returns are due by ${fmtDate(returnDue(rd))}</strong> (${inDays(daysUntil(returnDue(rd)))}).`;
  }

  // ---------------------------------------------------------------------------
  // Deadlines page + .ics export
  // ---------------------------------------------------------------------------
  function renderDeadlines() {
    const list = allDeadlines();
    $('#timeline').innerHTML = list.map(d => {
      const n = daysUntil(d.date);
      const cls = n < 0 ? 'past' : n <= 30 ? 'soon' : '';
      return `<li class="${cls}">
        <span class="date">${d.date.getDate()}<small>${d.date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</small></span>
        <span><a href="${d.href}">${d.title}</a><br><small>${d.sub}</small></span>
        <span class="days">${inDays(n)}</span></li>`;
    }).join('');

    $('#ics').href = icsUrl(list);
  }

  function icsUrl(list) {
    const ymd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const events = list.filter(d => d.date >= today).map((d, i) => [
      'BEGIN:VEVENT', `UID:ird-concept-${ymd(d.date)}-${i}`, `DTSTAMP:${ymd(today)}T000000Z`,
      `DTSTART;VALUE=DATE:${ymd(d.date)}`, `SUMMARY:${d.title} (${d.sub})`,
      'BEGIN:VALARM', 'TRIGGER:-P3D', 'ACTION:DISPLAY', `DESCRIPTION:${d.title}`, 'END:VALARM', 'END:VEVENT',
    ].join('\r\n'));
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//IRD redesign concept//EN', ...events, 'END:VCALENDAR'].join('\r\n');
    return URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  }

  // ---------------------------------------------------------------------------
  // Quick check: "Do I need to pay?" → personal plan
  // ---------------------------------------------------------------------------
  const checkForm = $('#check-form');
  let planPrefill = null;

  function prefillCheck(monthly) {
    checkForm.querySelector('[value="salary"]').checked = true;
    $('#c-salary').value = monthly.toLocaleString('en-LK');
    renderPlan();
  }

  function renderPlan() {
    const src = $$('[name="src"]:checked', checkForm).map(i => i.value);
    const hasSalary = src.includes('salary');
    const hasOther = src.includes('business') || src.includes('rent');
    $('#f-salary').hidden = !hasSalary;
    $('#f-other').hidden = !hasOther;
    $('#f-none').hidden = src.length > 0;

    const tinAns = (checkForm.querySelector('[name="c-tin"]:checked') || {}).value;
    const sal = hasSalary ? num($('#c-salary').value) * 12 : 0;
    const oth = hasOther ? num($('#c-other').value) * 12 : 0;
    const out = $('#plan');
    planPrefill = null;
    if (!src.length || sal + oth === 0) { out.innerHTML = ''; return; }

    const y = yoaStartOf(today);
    const tTotal = computeTax(sal + oth, y);
    const tSalary = computeTax(sal, y).total;           // roughly what APIT already covers
    const balance = Math.max(0, tTotal.total - tSalary);
    const quarterly = balance / 4;
    const head = (cls, icon, title, sub) =>
      `<div class="verdict ${cls}"><span class="verdict-icon">${ic(icon)}</span><div><h2>${title}</h2><p>${sub}</p></div></div>`;

    if (tTotal.total === 0) {
      out.innerHTML = head('ok', 'check-circle', 'No, you don’t need to pay income tax.',
        `Your yearly income (about ${rs(sal + oth)}) is below the tax-free amount of ${rs(tTotal.relief)} for ${yoaLabel(y)}.`) +
        `<p class="hint">If your income goes up during the year, run this check again.</p>`;
      return;
    }
    if (balance === 0) {
      out.innerHTML = head('ok', 'shield', 'You’re covered. There’s nothing to pay yourself.',
        `Your employer deducts <abbr data-term="APIT">APIT</abbr> of about <strong>${rs(tSalary / 12)}</strong> a month from your salary and pays it to IRD for you. That is your income tax.`) +
        `<ul class="plan-tips"><li>Check that your payslip shows an APIT deduction close to this amount.</li>
         <li>At the end of the year, ask your employer for your APIT certificate and keep it safe.</li>
         <li>If you start freelancing or renting out property, run this check again.</li></ul>`;
      bindTerms(out);
      return;
    }

    const dates = instalmentDates(y);
    const nextIdx = dates.findIndex(d => d >= today);
    const steps = [];
    if (tinAns !== 'yes') steps.push(`<li class="${tinAns ? '' : 'todo'}"><h3>Get your TIN</h3>
      <p>${tinAns === 'unsure' ? 'Check your old tax letters or ask your employer’s payroll team. If you don’t have one, ' : ''}Register online for free in about 10 minutes.</p>
      <a class="btn small-btn" href="#register">Get a TIN</a></li>`);
    else steps.push(`<li class="done-step"><h3>You have a TIN</h3><p>You already have one. Have it ready when you pay.</p></li>`);

    steps.push(`<li><h3>Pay ${rs(quarterly)} four times this year</h3>
      <p>Tax isn’t deducted from your ${src.filter(s => s !== 'salary').map(s => s === 'rent' ? 'rent' : 'business / freelance').join(' and ')} income, so you pay it yourself in 4 instalments.</p>
      <ul class="instalments">${dates.map((d, i) => {
        const n = daysUntil(d);
        const cls = n < 0 ? 'missed' : i === nextIdx ? 'next' : '';
        const note = n < 0 ? 'Date passed. Pay soon to limit penalties.' : i === nextIdx ? `Next, ${inDays(n)}` : '';
        return `<li class="${cls}"><span>Instalment ${i + 1}</span><span>${fmtDate(d)}</span><strong>${rs(quarterly)}</strong><small>${note}</small></li>`;
      }).join('')}</ul>
      <a class="btn small-btn" href="#pay" data-plan-pay>Pay ${nextIdx >= 0 ? 'instalment ' + (nextIdx + 1) : 'now'}: ${rs(quarterly)}</a></li>`);

    steps.push(`<li><h3>File your return by ${fmtDate(returnDue(y))}</h3>
      <p>Once a year, declare everything you earned in ${yoaLabel(y)}. It takes about 20 minutes online if you’ve kept your payment receipts.</p>
      <a class="btn small-btn ghost" href="#file">What filing involves</a></li>`);

    out.innerHTML = head('due', 'info', `Yes, about ${rs(balance)} for ${yoaLabel(y)}.`,
        hasSalary ? `Your employer’s APIT covers your salary. This amount is the tax on your other income.` : `This is your estimated tax for the year (1 Apr ${y} – 31 Mar ${y + 1}).`) +
      `<h2 class="plan-title">Your plan</h2><ol class="plan">${steps.join('')}</ol>
      <div class="slip-actions">
        <a class="btn ghost" download="my-tax-plan.ics" href="${icsUrl([...dates.map((d, i) => ({ date: d, title: `Pay income tax instalment ${i + 1}: ${rs(quarterly)}`, sub: `Y/A ${yoaLabel(y)}` })), { date: returnDue(y), title: 'File income tax return', sub: `Y/A ${yoaLabel(y)}` }])}">${ic('calendar')} Add dates to calendar</a>
        <a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(
          `My income tax plan ${yoaLabel(y)} (estimate)\n` + dates.map((d, i) => `• Instalment ${i + 1}: ${rs(quarterly)} by ${fmtDate(d)}`).join('\n') + `\n• File return by ${fmtDate(returnDue(y))}`)}">${ic('chat')} Send to WhatsApp</a>
      </div>
      <details><summary>How we worked this out</summary>
        <p>Total yearly income ${rs(sal + oth)} gives an estimated tax of ${rs(tTotal.total)}${hasSalary ? `. APIT on your salary covers about ${rs(tSalary)}` : ''}, leaving ${rs(balance)}.</p></details>`;
    planPrefill = { y, amount: quarterly, quarter: nextIdx >= 0 ? nextIdx + 1 : 4, tin: tinAns === 'yes' ? 'yes' : null };
    bindTerms(out);
  }
  checkForm.addEventListener('input', renderPlan);
  checkForm.addEventListener('change', renderPlan);
  checkForm.addEventListener('submit', e => e.preventDefault());
  $('#plan').addEventListener('click', e => {
    if (!e.target.closest('[data-plan-pay]') || !planPrefill) return;
    prefillWizard('instalment', planPrefill.y, planPrefill.amount, planPrefill.quarter, planPrefill.tin);
  });

  // ---------------------------------------------------------------------------
  // Glossary + tooltips
  // ---------------------------------------------------------------------------
  function renderGlossary() {
    $('#glossary').innerHTML = Object.entries(GLOSSARY)
      .map(([k, v]) => `<dt id="term-${k.replace(/\W+/g, '-')}">${k}</dt><dd>${v}</dd>`).join('');
  }

  const tip = $('#tooltip');
  function showTip(el) {
    const key = Object.keys(GLOSSARY).find(k => k.split(' / ')[0] === el.dataset.term || k === el.dataset.term);
    if (!key) return;
    tip.textContent = GLOSSARY[key];
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(r.left + scrollX, scrollX + innerWidth - 296)) + 'px';
    tip.style.top = (r.bottom + scrollY + 6) + 'px';
  }
  function bindTerms(root = document) { $$('abbr[data-term]:not([tabindex])', root).forEach(bindTerm); }
  function bindTerm(el) {
    el.tabIndex = 0;
    el.setAttribute('aria-describedby', 'tooltip');
    ['mouseenter', 'focus'].forEach(ev => el.addEventListener(ev, () => showTip(el)));
    ['mouseleave', 'blur'].forEach(ev => el.addEventListener(ev, () => { tip.hidden = true; }));
    el.addEventListener('click', () => showTip(el));
  }
  bindTerms();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') tip.hidden = true; });

  // ---------------------------------------------------------------------------
  // Estimator
  // ---------------------------------------------------------------------------
  let lastEstimate = null;

  function fillYoaSelect(sel, years, selected) {
    sel.innerHTML = years.map(y => `<option value="${y}" ${y === selected ? 'selected' : ''}>${yoaLabel(y)} (1 Apr ${y} – 31 Mar ${y + 1})</option>`).join('');
  }

  function renderEstimate() {
    const y = Number($('#est-yoa').value);
    const emp = num($('#emp').value), other = num($('#other').value), apit = num($('#apit').value);
    const income = emp + other;
    const out = $('#est-result');
    if (!income) { out.innerHTML = '<p class="hint">Enter your income above to see an estimate.</p>'; lastEstimate = null; return; }

    const r = computeTax(income, y);
    const balance = Math.max(0, r.total - apit);
    const refund = Math.max(0, apit - r.total);
    const quarterly = balance / 4;
    lastEstimate = { y, balance, quarterly };

    const rows = r.rows.map(x => `<tr><td>${rs(x.part)} at ${Math.round(x.rate * 100)}%</td><td>${rs(x.tax)}</td></tr>`).join('');
    let verdict;
    if (r.total === 0) verdict = `<div class="callout success">Your income is below the tax-free personal relief of ${rs(r.relief)}. <strong>No income tax to pay.</strong></div>`;
    else if (refund > 0) verdict = `<div class="callout success">APIT deducted is more than your estimated tax. You may be due a <strong>refund of about ${rs(refund)}</strong>. File a return to claim it.</div>`;
    else if (other === 0 && balance < 1) verdict = `<div class="callout success">Your employer's APIT covers your tax. <strong>Nothing more to pay.</strong></div>`;
    else verdict = `<div class="callout">You have about <strong>${rs(balance)}</strong> left to pay for ${yoaLabel(y)}. If this is from business, freelance or rental income, pay it in <strong>4 instalments of about ${rs(quarterly)}</strong>.</div>`;

    out.innerHTML = `
      <h2>Your estimate for ${yoaLabel(y)}</h2>
      <p class="hint">Estimated total income tax</p>
      <p class="big">${rs(r.total)}</p>
      ${verdict}
      <details><summary>See how this was worked out</summary>
        <table class="breakdown">
          <tr><th>Total income</th><td>${rs(income)}</td></tr>
          <tr><th>Less tax-free personal relief</th><td>− ${rs(Math.min(income, r.relief))}</td></tr>
          <tr><th>Taxable income</th><td>${rs(r.taxable)}</td></tr>
          ${rows}
          <tr><th>Total tax</th><th>${rs(r.total)}</th></tr>
          <tr><td>Less APIT already deducted</td><td>− ${rs(apit)}</td></tr>
          <tr><th>Balance to pay</th><th>${rs(balance)}</th></tr>
        </table>
      </details>
      ${balance > 0 ? `<div class="result-actions">
        <a class="btn" href="#pay" data-prefill="instalment">Pay an instalment of ${rs(quarterly)}</a>
        <a class="btn ghost" href="#pay" data-prefill="final">Pay the full ${rs(balance)}</a></div>` : ''}`;
  }

  $('#est-result').addEventListener('click', e => {
    const a = e.target.closest('[data-prefill]');
    if (!a || !lastEstimate) return;
    prefillWizard(a.dataset.prefill, lastEstimate.y, a.dataset.prefill === 'final' ? lastEstimate.balance : lastEstimate.quarterly);
  });

  // ---------------------------------------------------------------------------
  // Pay wizard
  // ---------------------------------------------------------------------------
  const form = $('#wizard');
  let step = 1;
  const val = name => (form.querySelector(`[name="${name}"]:checked`) || form.elements[name] || {}).value || '';

  function applyConditionals() {
    $$('[data-if]', form).forEach(el => {
      const [name, opts] = el.dataset.if.split('=');
      el.hidden = !opts.split('|').includes(val(name));
    });
  }

  function fillQuarters() {
    const y = Number($('#yoa').value);
    const dates = instalmentDates(y);
    const nextIdx = Math.max(0, dates.findIndex(d => d >= today));
    $('#quarter').innerHTML = dates.map((d, i) =>
      `<option value="${i + 1}" ${i === nextIdx ? 'selected' : ''}>Instalment ${i + 1}: due ${fmtDate(d)}</option>`).join('');
  }

  function canAdvance() {
    if (step === 1) {
      const h = val('hasTin');
      if (!h || h === 'no') return false;
      const tin = $('#tin').value.trim();
      const bad = tin && !/^\d{9}$/.test(tin);
      $('#tin-error').hidden = !bad; $('#tin').setAttribute('aria-invalid', bad);
      return !bad;
    }
    if (step === 2) { const k = val('kind'); return k === 'instalment' || k === 'final'; }
    if (step === 3) {
      const ok = num($('#amount').value) > 0;
      $('#amount-error').hidden = ok; $('#amount').setAttribute('aria-invalid', !ok);
      return ok;
    }
    return true;
  }

  function periodCode() {
    const y = Number($('#yoa').value);
    return yoaCode(y) + (val('kind') === 'instalment' ? $('#quarter').value : '0');
  }

  function renderSummary() {
    const y = Number($('#yoa').value);
    const kind = val('kind');
    const what = kind === 'instalment' ? `instalment ${$('#quarter').value} of 4` : 'final balance';
    const due = kind === 'instalment' ? instalmentDates(y)[$('#quarter').value - 1] : finalPayDue(y);
    const amount = num($('#amount').value);
    const tin = $('#tin').value;
    // [label, displayed value, value to copy (null = not copyable), explanation]
    const fields = [
      ['Pay to', 'Inland Revenue Department', null, ''],
      ['TIN', tin || 'Your 9-digit TIN', tin || null, ''],
      ['Tax type', 'IIT (Individual Income Tax)', 'IIT', 'Code 05. Choose IIT, not PIT or PAYE.'],
      ['Payment type', 'Self assessment', 'Self assessment', 'You worked out this tax yourself. If IRD sent you a notice, pay using the DIN on it instead.'],
      ['Period code', periodCode(), periodCode(), `Y/A ${yoaLabel(y)}, ${what}`],
      ['Amount', rs(amount), amount.toFixed(2), ''],
    ];
    $('#pay-summary').innerHTML = fields.map(([k, v, c, why], i) => `
      <li><span class="pf-n">${i + 1}</span>
        <span class="pf-body"><span class="pf-label">${k}</span>
          ${c ? `<button type="button" class="pf-value" data-copy="${c}" aria-label="Copy ${k}: ${v}">${v}<span class="pf-copy">Copy</span></button>`
              : `<span class="pf-value static">${v}</span>`}
          ${why ? `<small class="pf-why">${why}</small>` : ''}</span></li>`).join('');
    const n = daysUntil(due);
    $('#due-line').innerHTML = `Due by <strong>${fmtDate(due)}</strong> (${inDays(n)}).` +
      (n < 0 ? ' <span class="overdue">Overdue. Pay as soon as you can, because late payment can add penalties and interest.</span>' : '');
    const lines = [...fields.map(([k, v]) => [k, v]), ['Year of assessment', yoaLabel(y)], ['Due by', fmtDate(due)]];
    $('#whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent('IRD income tax payment\n' + lines.map(([k, v]) => `${k}: ${v}`).join('\n'));
    return lines;
  }

  $('#pay-summary').addEventListener('click', async e => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const label = b.querySelector('.pf-copy');
    try { await navigator.clipboard.writeText(b.dataset.copy); label.textContent = 'Copied'; }
    catch { label.textContent = 'Select to copy'; }
    setTimeout(() => { label.textContent = 'Copy'; }, 1500);
  });
  $('#print-slip').addEventListener('click', () => window.print());
  $('#print-slip-2').addEventListener('click', () => window.print());

  function showStep(n, moveFocus = true) {
    step = n;
    $$('.step', form).forEach(f => { f.hidden = Number(f.dataset.step) !== n; });
    $$('#stepper li').forEach((li, i) => {
      li.classList.toggle('done', i + 1 < n);
      li.classList.toggle('current', i + 1 === n);
      i + 1 === n ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current');
    });
    $('#back').style.visibility = n === 1 ? 'hidden' : 'visible';
    $('#next').hidden = n === 4;
    if (n === 4) { renderSummary(); document.dispatchEvent(new Event('ird:step4')); }
    updateNext();
    if (moveFocus) { const legend = $(`.step[data-step="${n}"] legend`); legend.tabIndex = -1; legend.focus(); }
  }

  function updateNext() {
    const h = val('hasTin');
    $('#next').disabled = (step === 1 && (!h || h === 'no')) || (step === 2 && !['instalment', 'final'].includes(val('kind')));
  }

  form.addEventListener('change', e => {
    applyConditionals();
    if (e.target.name === 'yoa') fillQuarters();
    updateNext();
  });
  form.addEventListener('submit', e => { e.preventDefault(); if (canAdvance() && step < 4) showStep(step + 1); });
  $('#back').addEventListener('click', () => step > 1 && showStep(step - 1));

  function prefillWizard(kind, y, amount, quarter, tinAns, start) {
    form.querySelector(`[name="kind"][value="${kind}"]`).checked = true;
    if (tinAns) form.querySelector(`[name="hasTin"][value="${tinAns}"]`).checked = true;
    $('#yoa').value = y; fillQuarters();
    if (quarter) $('#quarter').value = quarter;
    $('#amount').value = amount.toFixed(2);
    applyConditionals();
    // Start at step 1 if TIN not yet answered, otherwise jump to amount.
    setTimeout(() => showStep(start || (val('hasTin') && val('hasTin') !== 'no' ? 3 : 1)));
  }

  $('#bank').innerHTML = '<option value="">Select your bank…</option>' + BANKS.map(b => `<option>${b}</option>`).join('');
  $('#bank').addEventListener('change', e => {
    const b = e.target.value;
    $('#bank-info').textContent = !b ? '' : b === 'Other bank'
      ? 'Look for “LankaPay CEFTS” or “Government payments” in your bank’s app. If it isn’t there, pay at a Bank of Ceylon or People’s Bank counter.'
      : `In the ${b} app or website, open Payments and look for “IRD”, “Government payments” or “LankaPay CEFTS”. Not every bank offers every channel, so if you can’t find it, use the counter option.`;
  });

  $('#copy-details').addEventListener('click', async () => {
    const text = renderSummary().map(([k, v]) => `${k}: ${v}`).join('\n');
    try { await navigator.clipboard.writeText(text); $('#copy-details').textContent = 'Copied'; }
    catch { $('#copy-details').textContent = 'Copy failed. Select the details above instead.'; }
    setTimeout(() => { $('#copy-details').textContent = 'Copy all'; }, 2000);
  });

  // Language switch: translates the login page and navigation, and is remembered between visits.
  function setLang(lang, announce) {
    $$('[data-i18n]').forEach(el => {
      if (!el.dataset.en) el.dataset.en = el.textContent;
      el.textContent = (I18N[lang] && I18N[lang][el.dataset.i18n]) || el.dataset.en;
    });
    document.documentElement.lang = lang;
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
    localStorage.setItem('ird-lang', lang);
    if (announce && lang !== 'en' && window.IRD_TOAST) window.IRD_TOAST(lang === 'si'
      ? 'සිංහල: in this concept the login page and menus are translated.'
      : 'தமிழ்: in this concept the login page and menus are translated.');
  }
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang, true)));

  // Logged-in users: we already know the TIN, so start at "What are you paying?"
  function payAsUser(tin) {
    if (step !== 1) return;
    form.querySelector('[name="hasTin"][value="yes"]').checked = true;
    $('#tin').value = tin;
    applyConditionals(); updateNext();
    showStep(2, false);
  }

  // Shared helpers for portal.js
  // Clear everything typed into the payment flow (used on log out, so the next person on a shared computer sees nothing).
  function resetPay() {
    form.reset(); $('#tin').value = ''; $('#amount').value = '';
    fillQuarters(); applyConditionals(); showStep(1, false);
  }

  window.IRD = { payAsUser, resetPay, relang: () => setLang(localStorage.getItem('ird-lang') || 'en', false), rs, fmtDate, inDays, daysUntil, today, instalmentDates, returnDue, yoaStartOf, yoaLabel, yoaCode,
    computeTax, icsUrl, bindTerms, prefillWizard, periodCode, getPayment: () => ({
      kind: val('kind'), y: Number($('#yoa').value), quarter: Number($('#quarter').value), amount: num($('#amount').value), tin: $('#tin').value }) };

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  const cur = yoaStartOf(today);
  fillYoaSelect($('#yoa'), [cur, cur - 1, cur - 2], cur);
  fillYoaSelect($('#est-yoa'), [cur, cur - 1, cur - 2], cur);
  fillQuarters();
  ['#est-yoa', '#emp', '#other', '#apit'].forEach(s => $(s).addEventListener('input', renderEstimate));
  $('#estimator').addEventListener('submit', e => e.preventDefault());

  renderNextDeadline();
  renderDeadlines();
  renderGlossary();
  renderEstimate();
  showStep(1, false);
  setLang(localStorage.getItem('ird-lang') || 'en', false);
  route();
})();
