/* e-Services portal concept: login, PIN recovery, TIN registration, dashboard, direct pay, receipt.
   All data is a fictional demo account kept in sessionStorage. Nothing is sent anywhere. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ic = (n, c = 'i') => `<svg class="${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const I = () => window.IRD; // set by app.js (loaded after this file)

  const DEMO = { tin: '123456789', pin: '2026', name: 'Nimal', salaryMonthly: 300000, otherMonthly: 150000 };
  const PROTECTED = ['dashboard', 'paid'];

  // ---------------------------------------------------------------- state
  const load = () => JSON.parse(sessionStorage.getItem('ird-demo') || 'null') || { loggedIn: false, paid: [1], attempts: 3 };
  let state = load();
  const save = () => sessionStorage.setItem('ird-demo', JSON.stringify(state));

  function yearPlan() {
    const { yoaStartOf, today, computeTax } = I();
    const y = yoaStartOf(today);
    const sal = DEMO.salaryMonthly * 12, oth = DEMO.otherMonthly * 12;
    const balance = computeTax(sal + oth, y).total - computeTax(sal, y).total;
    return { y, balance, quarterly: balance / 4 };
  }

  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
  }

  window.IRD_TOAST = toast;

  // ---------------------------------------------------------------- router hooks (called by app.js)
  window.IRD_PORTAL = {
    guard(view) {
      if (PROTECTED.includes(view) && !state.loggedIn) return 'login';
      if (view === 'login' && state.loggedIn) return 'dashboard';
      return null;
    },
    onView(view) {
      const btn = $('#account-btn');
      btn.innerHTML = state.loggedIn ? `${ic('user')} ${DEMO.name}` : 'Log in';
      btn.href = state.loggedIn ? '#dashboard' : '#login';
      btn.hidden = view === 'login' && !state.loggedIn;
      if (view === 'dashboard') renderDashboard();
      if (view === 'paid') renderPaid();
      if (view === 'pay') { $('#pay-direct').hidden = !state.loggedIn; if (state.loggedIn) I().payAsUser(DEMO.tin); }
      if (view === 'register') restoreDraft();
    },
  };

  // ---------------------------------------------------------------- login
  const pinToggle = $('.pin-toggle');
  pinToggle.addEventListener('click', () => {
    const show = $('#l-pin').type === 'password';
    $('#l-pin').type = show ? 'text' : 'password';
    pinToggle.textContent = show ? 'Hide' : 'Show';
    pinToggle.setAttribute('aria-pressed', show);
  });

  const LOGIN_FOR = {
    company: { label: 'My company or business', tin: 'Company TIN' },
    client: { label: 'A client\'s tax (tax agent)', tin: 'Your tax agent TIN' },
    staff: { label: 'Staff and agent access', tin: 'Your TIN' },
    stamp: { label: 'Stamp duty (non-compounding)', tin: 'Your TIN' },
  };
  let loginFor = 'personal';
  function setLoginFor(mode) {
    loginFor = mode;
    const box = $('#login-for'), label = $('label[for="l-tin"]');
    if (mode === 'personal') {
      box.hidden = true;
      label.textContent = 'Your TIN';
    } else {
      box.innerHTML = `${ic('building')} <span>Logging in for <strong>${LOGIN_FOR[mode].label}</strong></span> <button type="button" class="link-btn" id="to-personal">Switch to personal</button>`;
      box.hidden = false;
      label.textContent = LOGIN_FOR[mode].tin;
      $('.other-login').open = false;
    }
    $('#login-error').hidden = true;
    $('#l-tin').focus();
  }
  $$('.mini-card').forEach(b => b.addEventListener('click', () => setLoginFor(b.dataset.for)));
  $('#login-for').addEventListener('click', e => { if (e.target.closest('#to-personal')) setLoginFor('personal'); });

  const LOCK_MS = 30000; // a real service would pause for 15 minutes; the demo uses 30 seconds
  $('#login-form').addEventListener('submit', e => {
    e.preventDefault();
    const tin = $('#l-tin').value.replace(/\D/g, ''), pin = $('#l-pin').value.trim();
    const err = $('#login-error');
    const fail = html => { err.innerHTML = html; err.hidden = false; };
    if (tin.length !== 9) return fail(`A TIN has 9 digits. You've entered ${tin.length}.`);
    if (!pin) return fail('Enter your PIN.');
    if (state.lockedUntil && Date.now() < state.lockedUntil) {
      const secs = Math.ceil((state.lockedUntil - Date.now()) / 1000);
      return fail(`For your security, logins are paused for 15 minutes. <a href="#forgot">Get a new PIN</a> if you've forgotten it.<br><small>Demo: try again in ${secs} seconds.</small>`);
    }
    if (loginFor !== 'personal') return fail('This demo only has a personal account. <button type="button" class="link-btn" id="err-personal">Switch to personal</button>');
    if (tin !== DEMO.tin || pin !== DEMO.pin) {
      state.attempts--;
      if (state.attempts <= 0) { state.lockedUntil = Date.now() + LOCK_MS; state.attempts = 3; save();
        return fail('That TIN and PIN still don\'t match, so we\'ve paused logins for 15 minutes to keep your account safe. <a href="#forgot">Get a new PIN</a> now instead.<br><small>Demo: the pause lasts 30 seconds.</small>'); }
      save();
      return fail(`That TIN and PIN don't match. Check your TIN, or <a href="#forgot">get a new PIN</a>.` +
        ` <br><small>${state.attempts} more ${state.attempts === 1 ? 'try' : 'tries'} before we pause logins for 15 minutes.</small>`);
    }
    err.hidden = true;
    state = { ...state, loggedIn: true, attempts: 3, lockedUntil: 0 }; save();
    location.hash = '#dashboard';
  });
  $('#login-error').addEventListener('click', e => { if (e.target.closest('#err-personal')) setLoginFor('personal'); });
  $('#l-tin').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });

  // ---------------------------------------------------------------- forgot PIN
  let fpStep = 1;
  $('#forgot-form').addEventListener('submit', e => {
    e.preventDefault();
    if (fpStep === 1) {
      const ok = /^\d{9}$/.test($('#fp-tin').value.trim());
      $('#fp-error').hidden = ok;
      if (!ok) return;
      fpStep = 2; $('#fp-step2').hidden = false; $('#fp-btn').textContent = 'Send my new PIN';
      return;
    }
    const to = $('[name="fp-to"]:checked').value;
    $('#fp-step1').hidden = $('#fp-step2').hidden = $('#fp-btn').hidden = true;
    $('#fp-done').hidden = false;
    $('#fp-done-text').textContent = to === 'email'
      ? 'We\'ve emailed a new PIN to n•••••@gmail.com. It should arrive in a few minutes. Check your spam folder too.'
      : 'We\'ve texted a new PIN to 07• ••• 4521. It should arrive in a few minutes.';
  });

  $('#fp-send').addEventListener('click', () => {
    const v = $('#fp-new').value.trim(), out = $('#fp-sent');
    out.hidden = false;
    out.innerHTML = !v || !$('#fp-nic').files.length
      ? `${ic('info')} <span>Add a photo of your NIC and your new mobile number or email.</span>`
      : `${ic('check')} <span>Sent. We'll check your NIC and send your new PIN to <strong>${escapeHtml(v)}</strong> within 1 working day. Reference UPD-${Math.floor(100000 + Math.random() * 900000)}.</span>`;
  });

  // ---------------------------------------------------------------- TIN registration
  const reg = $('#reg-form');
  let rstep = 1;
  const REG_FIELDS = ['r-nic', 'r-name', 'r-name-si', 'r-name-ta', 'r-mobile', 'r-email', 'r-address'];

  function parseNIC(raw) {
    const v = raw.trim().toUpperCase();
    let y, d;
    if (/^\d{9}[VX]$/.test(v)) { y = 1900 + Number(v.slice(0, 2)); d = Number(v.slice(2, 5)); }
    else if (/^\d{12}$/.test(v)) { y = Number(v.slice(0, 4)); d = Number(v.slice(4, 7)); }
    else return null;
    if (d > 500) d -= 500;
    const months = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // NIC day numbers always assume a 29-day February
    let m = 0;
    while (m < 12 && d > months[m]) { d -= months[m]; m++; }
    if (m > 11 || d < 1) return null;
    return new Date(y, m, d);
  }

  $('#r-nic').addEventListener('input', e => {
    const v = e.target.value.trim(), out = $('#nic-magic');
    const born = parseNIC(v);
    if (born) { out.className = 'nic-magic ok'; out.innerHTML = `${ic('sparkle')} Born <strong>${born.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. We read this from your NIC, so you don't need to type it.`; }
    else if (v.length >= 10) { out.className = 'nic-magic bad'; out.textContent = 'That doesn\'t look like an NIC number. Old NICs have 9 digits and a V or X. New ones have 12 digits.'; }
    else { out.className = 'nic-magic'; out.textContent = ''; }
  });

  reg.addEventListener('change', e => {
    if (e.target.name === 'r-why') $('#r-why-official').textContent = `Official category: ${e.target.value.charAt(0) + e.target.value.slice(1).toLowerCase()}`;
    saveDraft();
  });
  reg.addEventListener('input', saveDraft);

  function saveDraft() {
    const d = { why: ($('[name="r-why"]:checked', reg) || {}).value, step: rstep };
    REG_FIELDS.forEach(id => { d[id] = $('#' + id).value; });
    localStorage.setItem('ird-tin-draft', JSON.stringify(d));
  }
  let restored = false;
  function restoreDraft() {
    if (restored) return; restored = true;
    const d = JSON.parse(localStorage.getItem('ird-tin-draft') || 'null');
    if (d) {
      REG_FIELDS.forEach(id => { $('#' + id).value = d[id] || ''; });
      if (d.why) { const r = $(`[name="r-why"][value="${d.why}"]`, reg); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } }
      $('#r-nic').dispatchEvent(new Event('input'));
      if (d.step > 1 && d.step < 5) { showRStep(d.step); toast('Welcome back. We saved your progress.'); return; }
    }
    showRStep(1);
  }

  function regValid() {
    const err = $('#reg-error');
    const fail = m => { err.textContent = m; err.hidden = false; return false; };
    err.hidden = true;
    if (rstep === 1 && !$('[name="r-why"]:checked', reg)) return fail('Choose the reason closest to your situation.');
    if (rstep === 2) {
      if (!parseNIC($('#r-nic').value)) return fail('Enter a valid NIC number. We need it to confirm who you are.');
      if ($('#r-name').value.trim().length < 3) return fail('Enter your full name as it appears on your NIC.');
    }
    if (rstep === 3) {
      if (!/^0?7\d{8}$/.test($('#r-mobile').value.replace(/\D/g, ''))) return fail('Enter a Sri Lankan mobile number, such as 071 234 5678.');
      if (!/^\S+@\S+\.\S+$/.test($('#r-email').value)) return fail('Enter an email address. This is where your TIN and PIN will be sent.');
      if ($('#r-address').value.trim().length < 5) return fail('Enter your home address.');
    }
    if (rstep === 4 && !$('#r-confirm').checked) return fail('Please confirm that your details are correct.');
    return true;
  }

  function showRStep(n) {
    rstep = n;
    $$('.step', reg).forEach(f => { f.hidden = Number(f.dataset.rstep) !== n; });
    $$('#reg-stepper li').forEach((li, i) => { li.classList.toggle('done', i + 1 < n); li.classList.toggle('current', i + 1 === n); });
    $('#reg-back').style.visibility = n === 1 ? 'hidden' : 'visible';
    $('#reg-next').textContent = n === 4 ? 'Send my request' : 'Continue';
    if (n === 4) {
      const why = $('[name="r-why"]:checked', reg);
      const rows = [
        ['Reason', why ? why.closest('label').querySelector('strong').textContent : '', 1],
        ['NIC', $('#r-nic').value, 2], ['Name', $('#r-name').value, 2],
        ['Mobile', $('#r-mobile').value, 3], ['Email', $('#r-email').value, 3], ['Address', $('#r-address').value, 3],
      ];
      $('#reg-review').innerHTML = rows.map(([k, v, s]) => `<dt>${k}</dt><dd>${escapeHtml(v)} <button type="button" class="link-btn" data-goto="${s}">Change</button></dd>`).join('');
    }
  }
  $('#reg-review').addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b) showRStep(Number(b.dataset.goto)); });
  $('#reg-back').addEventListener('click', () => rstep > 1 && showRStep(rstep - 1));
  reg.addEventListener('submit', e => {
    e.preventDefault();
    if (!regValid()) return;
    if (rstep < 4) { showRStep(rstep + 1); saveDraft(); return; }
    $$('.step', reg).forEach(f => { f.hidden = true; });
    $('#reg-nav').hidden = true;
    $$('#reg-stepper li').forEach(li => { li.classList.add('done'); li.classList.remove('current'); });
    $('#reg-ref').innerHTML = `Reference <strong>TIN-REQ-${Math.floor(100000 + Math.random() * 900000)}</strong>. We've emailed you a copy.`;
    $('#reg-done').hidden = false;
    localStorage.removeItem('ird-tin-draft');
  });
  const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------- verify certificate
  $('#verify-form').addEventListener('submit', e => {
    e.preventDefault();
    const no = $('#v-no').value.trim(), tin = $('#v-tin').value.replace(/\D/g, '');
    const err = $('#verify-error'), out = $('#verify-result');
    err.hidden = true; out.innerHTML = '';
    if (no.length < 4) { err.textContent = 'Enter the certificate or registration number printed on the certificate.'; err.hidden = false; return; }
    if (tin.length !== 9) { err.textContent = `A TIN has 9 digits. You've entered ${tin.length}.`; err.hidden = false; return; }
    out.innerHTML = no === '000000'
      ? `<div class="verdict due"><span class="verdict-icon">${ic('alert')}</span><div><h2>We couldn't find this certificate</h2>
         <p>Check the number and TIN for typing mistakes. If they're correct, the certificate may not be genuine. Don't rely on it, and contact IRD on 1944.</p></div></div>`
      : `<div class="verdict ok"><span class="verdict-icon">${ic('shield')}</span><div><h2>This certificate is genuine</h2>
         <p>Issued by IRD to a registered taxpayer.</p></div></div>
         <dl class="review"><dt>Taxpayer</dt><dd>K•••• S•••• (Individual)</dd><dt>TIN</dt><dd>${tin.slice(0, 3)} ••• ${tin.slice(6)}</dd>
         <dt>Certificate</dt><dd>${escapeHtml(no)}</dd><dt>Status</dt><dd><span class="pill pill-ok">${ic('check')} Active</span></dd></dl>`;
  });

  // ---------------------------------------------------------------- dashboard
  function ring(frac) {
    const r = 52, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="${r}" class="ring-bg"/>
      <circle cx="60" cy="60" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - frac)}"/>
    </svg>`;
  }

  let certLabel = 'APIT certificate';
  function renderDashboard() {
    const { rs, fmtDate, inDays, daysUntil, today, instalmentDates, returnDue, yoaLabel } = I();
    const { y, balance, quarterly } = yearPlan();
    const dates = instalmentDates(y);
    const paid = state.paid.slice().sort();
    const overdue = dates.map((d, i) => i + 1).filter(q => !paid.includes(q) && dates[q - 1] < today);
    const nextQ = [1, 2, 3, 4].find(q => !paid.includes(q));
    const hr = new Date().getHours();
    $('#greet').textContent = `${hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'}, ${DEMO.name}`;

    const onTrack = overdue.length === 0;
    const { computeTax } = I();
    const sal = DEMO.salaryMonthly * 12, all = sal + DEMO.otherMonthly * 12;
    $('#status-card').innerHTML = `
      <div class="ring-wrap">${ring(paid.length / 4)}<div class="ring-label"><strong>${paid.length}/4</strong><small>paid</small></div></div>
      <div>
        <p class="status-pill ${onTrack ? 'good' : 'warn'}">${onTrack ? ic('check') + ' On track' : ic('alert') + ` ${overdue.length} payment${overdue.length > 1 ? 's' : ''} overdue`}</p>
        <h2>${rs(paid.length * quarterly)} <small>of ${rs(balance)}</small></h2>
        <p class="hint">Income tax for ${yoaLabel(y)} on your freelance income. Your salary's tax is covered by your employer's APIT.</p>
        <details class="explain"><summary>How was this worked out?</summary>
          <p>Estimated income for ${yoaLabel(y)}: ${rs(all)} (salary ${rs(sal)} + freelance ${rs(all - sal)}). Tax on all of it: ${rs(computeTax(all, y).total)}.
          Your employer's APIT covers ${rs(computeTax(sal, y).total)}, which leaves <strong>${rs(balance)}</strong>, paid in 4 instalments of ${rs(quarterly)}.</p></details>
      </div>`;

    if (nextQ) {
      const due = dates[nextQ - 1], n = daysUntil(due);
      $('#next-card').innerHTML = `
        <p class="eyebrow">Next up</p>
        <h2>Instalment ${nextQ} of 4</h2>
        <p class="next-amt">${rs(quarterly)}</p>
        <p class="${n < 0 ? 'overdue' : n <= 14 ? 'soon-txt' : 'hint'}">${n < 0 ? 'Was due' : 'Due'} ${fmtDate(due)} · <strong>${inDays(n)}</strong></p>
        <a href="#pay" class="btn btn-block" data-dash-pay>Pay ${rs(quarterly)} now</a>
        <p class="hint small center">Takes about 30 seconds. Everything is already filled in.</p>`;
    } else {
      $('#next-card').innerHTML = `<p class="eyebrow">Next up</p><h2>All paid for ${yoaLabel(y)}</h2>
        <p>Nothing more to pay this year. Your next step is to file your return by <strong>${fmtDate(returnDue(y))}</strong>.</p>`;
    }

    // Last year's return: filed on 12 Oct in this demo, or still to file if that date hasn't come yet.
    const prev = y - 1, filed = new Date(y, 9, 12), isFiled = filed <= today;
    $('#return-h').textContent = `Your ${yoaLabel(prev)} return`;
    $('#return-track').innerHTML = isFiled ? `
      <li class="done"><strong>Return submitted</strong><span>${fmtDate(filed)} · on time</span></li>
      <li class="current"><strong>IRD is checking it</strong><span>Nothing to do. We'll message you if we need anything.</span></li>
      <li><strong>Assessment confirmed</strong><span>You'll get a notice by email</span></li>` : `
      <li class="current"><strong>File your return</strong><span>Due ${fmtDate(returnDue(prev))} · ${inDays(daysUntil(returnDue(prev)))}</span></li>
      <li><strong>IRD checks it</strong><span>Usually nothing for you to do</span></li>
      <li><strong>Assessment confirmed</strong><span>You'll get a notice by email</span></li>`;
    $('#inbox-msg').innerHTML = isFiled
      ? `<strong>We've received your ${yoaLabel(prev)} return</strong><p>Thanks for filing on time. We're checking it now. You don't need to do anything unless we contact you.</p><small>${fmtDate(filed)}</small>`
      : `<strong>Your ${yoaLabel(prev)} return is due ${fmtDate(returnDue(prev))}</strong><p>Have your APIT certificate and freelance income records ready. It takes about 20 minutes.</p><small>Reminder</small>`;
    certLabel = `APIT certificate ${yoaLabel(prev)}`;
    $('#dl-cert').lastChild.textContent = certLabel;

    $('#activity').innerHTML = paid.map(q => {
      const when = q === 1 ? new Date(dates[0].getTime() - 5 * 864e5) : new Date(state.paidAt?.[q] || today);
      return `<li><span class="tile tile-ok tile-sm">${ic('check')}</span><span><strong>Instalment ${q}</strong><small>Paid ${fmtDate(when)}</small></span><span class="act-amt">${rs(quarterly)}<small class="ok-txt">Received</small></span></li>`;
    }).join('') || '<li class="hint">No payments yet this year.</li>';
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-dash-pay]')) {
      const { y, quarterly } = yearPlan();
      const q = [1, 2, 3, 4].find(n => !state.paid.includes(n)) || 4;
      $('#tin').value = DEMO.tin;
      I().prefillWizard('instalment', y, quarterly, q, 'yes', 4);
    }
    if (e.target.closest('#dl-cert')) { e.preventDefault(); toast(`${certLabel} downloaded (demo)`); }
    if (e.target.closest('#logout')) { e.preventDefault(); state = { loggedIn: false, paid: [1], attempts: 3, lockedUntil: 0 }; save(); I().resetPay(); $('#l-pin').value = ''; location.hash = '#home'; toast('You\'ve logged out safely.'); }
  });

  // ---------------------------------------------------------------- direct pay → receipt
  document.addEventListener('ird:step4', () => {
    const p = I().getPayment();
    $('#pay-now-btn').textContent = `Pay ${I().rs(p.amount)} now`;
    $('#pay-now-btn').disabled = false;
  });

  $('#pay-now-btn').addEventListener('click', () => {
    const b = $('#pay-now-btn'), p = I().getPayment();
    b.disabled = true;
    b.innerHTML = '<span class="spinner" aria-hidden="true"></span> Connecting to LankaPay…';
    setTimeout(() => { b.innerHTML = '<span class="spinner" aria-hidden="true"></span> Confirming with your bank…'; }, 900);
    setTimeout(() => {
      if (p.kind === 'instalment' && !state.paid.includes(p.quarter)) {
        state.paid.push(p.quarter);
        state.paidAt = { ...(state.paidAt || {}), [p.quarter]: Date.now() };
      }
      state.last = { ...p, period: I().periodCode(), ref: 'IRD' + Date.now().toString().slice(-9), at: Date.now() };
      save();
      location.hash = '#paid';
    }, 1800);
  });

  function renderPaid() {
    const { rs, fmtDate, yoaLabel, instalmentDates, icsUrl } = I();
    const L = state.last;
    if (!L) { location.replace('#dashboard'); return; }
    const at = new Date(L.at);
    $('#paid-lead').textContent = `IRD has received ${rs(L.amount)}. You don't need to do anything else.`;
    $('#receipt').innerHTML = `
      <div class="receipt-head"><span>Inland Revenue · Payment receipt</span><span>${ic('check')} Received</span></div>
      <dl>
        <dt>Reference</dt><dd>${L.ref}</dd>
        <dt>Date and time</dt><dd>${fmtDate(at)}, ${at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</dd>
        <dt>TIN</dt><dd>${L.tin || DEMO.tin}</dd>
        <dt>Tax</dt><dd>IIT · Individual Income Tax (05)</dd>
        <dt>For</dt><dd>${L.kind === 'instalment' ? `Instalment ${L.quarter} of 4` : 'Final balance'}, Y/A ${yoaLabel(L.y)} (period ${L.period})</dd>
        <dt>Amount</dt><dd class="receipt-amt">${rs(L.amount)}</dd>
      </dl>
      <p class="receipt-foot">Also saved to your account and emailed to n•••••@gmail.com</p>`;
    const n = state.paid.length;
    $('#paid-progress').innerHTML = `
      <div class="bar" role="img" aria-label="${n} of 4 instalments paid">${[1, 2, 3, 4].map(q => `<span class="${state.paid.includes(q) ? 'on' : ''}"></span>`).join('')}</div>
      <p>${n === 4 ? 'All 4 instalments paid for this year. Well done.' : `<strong>${n} of 4</strong> instalments done for ${yoaLabel(L.y)}. ${4 - n} to go.`}</p>`;
    const nextQ = [1, 2, 3, 4].find(q => !state.paid.includes(q));
    const ics = $('#paid-ics');
    ics.hidden = !nextQ;
    if (nextQ) ics.href = icsUrl([{ date: instalmentDates(L.y)[nextQ - 1], title: `Pay income tax instalment ${nextQ}: ${rs(L.amount)}`, sub: `Y/A ${yoaLabel(L.y)}` }]);
  }
})();
