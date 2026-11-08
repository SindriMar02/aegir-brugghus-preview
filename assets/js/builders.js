/* ÆGIR Brugghús prototype: hall enquiry builder, trade order builder, staff demo. Nothing is sent anywhere:
   the builders write one structured e-mail (mailto: or copy). Staff changes are saved in this browser only. */
(() => {
  'use strict';
  const A = window.AEGIR, U = window.AEGIR_UTIL; if (!A || !U) return;
  const { $, $$, pad, hh, store, reduce, EASE_POUR, EASE_IO, toast, copyText, flashLabel } = U;
  const t = A.t, body = document.body, is = A.lang === 'is';
  const lc = (s) => encodeURIComponent(s);
  const DF = new Intl.DateTimeFormat(is ? 'is-IS' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const fmtDate = (d) => DF.format(d);
  /* inline errors next to the field, aria-invalid + aria-describedby, first bad field takes focus */
  const flag = (i, msg) => { i.classList.add('is-bad'); i.setAttribute('aria-invalid', 'true'); const f = i.closest('.fld'); let e = f && f.querySelector('.fld__err'); if (!e && f) { e = document.createElement('small'); e.className = 'fld__err'; e.id = (i.id || 'f' + Math.random().toString(36).slice(2, 6)) + '-err'; f.appendChild(e); } if (e) { e.textContent = msg; i.setAttribute('aria-describedby', e.id); } };
  const unflag = (i) => { i.classList.remove('is-bad'); i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); const f = i.closest('.fld'), e = f && f.querySelector('.fld__err'); if (e) e.remove(); };
  const badOf = (inputs) => inputs.filter(i => !i.value.trim() || (i.dataset.f === 'email' && !/.+@.+\..+/.test(i.value)));
  const anim = (el, kf, o) => reduce.matches ? null : el.animate(kf, { fill: 'both', ...o });

  /* stepper with press-and-hold repeat; fires onChange(value) */
  const holdRepeat = (btn, fn) => {
    let h, iv;
    const stop = () => { clearTimeout(h); clearInterval(iv); };
    btn.addEventListener('pointerdown', (e) => { if (e.button) return; fn(); h = setTimeout(() => { iv = setInterval(fn, 125); }, 450); });
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
    btn.addEventListener('click', (e) => { e.preventDefault(); });
  };
  const roll = (out, v, dir) => { const old = out.textContent; if (old === String(v)) return; if (reduce.matches) { out.textContent = v; return; } const span = document.createElement('span'); span.textContent = v; span.style.cssText = 'position:absolute;left:0;right:0;top:0'; out.appendChild(span); const oldS = document.createElement('span'); oldS.textContent = old; oldS.style.cssText = 'position:absolute;left:0;right:0;top:0'; out.textContent = ''; out.appendChild(oldS); out.appendChild(span); const s = dir >= 0 ? 100 : -100; oldS.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(${-s}%)`, opacity: 0 }], { duration: 200, easing: EASE_IO, fill: 'forwards' }); const a = span.animate([{ transform: `translateY(${s}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: EASE_IO, fill: 'forwards' }); a.onfinish = () => { out.textContent = v; }; };
  const shake = (el) => { el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake'); setTimeout(() => el.classList.remove('is-shake'), 220); };

  /* summary sheet on phones (bottom bar opens it) */
  const sumInit = (root) => {
    const sum = $('[data-sum]', root), bar = $('[data-sumbar]', root); if (!sum || !bar) return { setBar() {} };
    sum.tabIndex = -1; sum.setAttribute('role', 'dialog'); const x = document.createElement('button'); x.type = 'button'; x.className = 'sheet__x'; x.setAttribute('aria-label', t.sheet.close); x.innerHTML = '<span></span><span></span>'; x.style.display = 'none'; sum.prepend(x);
    const mq = matchMedia('(max-width: 899px)'); let bd, open = false, viaKey = false;
    const sync = () => { bar.hidden = !mq.matches; x.style.display = mq.matches ? 'block' : 'none'; if (!mq.matches) close(true); };
    const openS = (e) => { open = true; viaKey = e.detail === 0; if (!bd) { bd = document.createElement('div'); bd.className = 'sum-bd'; bd.addEventListener('click', () => close()); document.body.appendChild(bd); } bd.hidden = false; void bd.offsetWidth; bd.classList.add('is-on'); sum.classList.add('is-open'); bar.setAttribute('aria-expanded', 'true'); body.classList.add('is-locked'); (viaKey ? (sum.querySelector('a,button') || sum) : sum).focus({ preventScroll: true }); };
    function close(silent) { if (!open) return; open = false; sum.classList.remove('is-open'); bar.setAttribute('aria-expanded', 'false'); body.classList.remove('is-locked'); if (bd) { bd.classList.remove('is-on'); setTimeout(() => { bd.hidden = true; }, 280); } if (!silent && viaKey) bar.focus({ preventScroll: true }); }
    bar.addEventListener('click', (e) => (open ? close() : openS(e))); x.addEventListener('click', () => close());
    sum.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    mq.addEventListener('change', sync); sync();
    return { setBar(txt) { const n = $('[data-sumbar-n]', bar); if (n && n.textContent !== txt) n.textContent = txt; } };
  };

  /* summary lines that appear when filled and crossfade when they change */
  const lineStore = (dl) => { const rows = {}; return (key, label, val) => { const have = rows[key]; if (!val) { if (have) { const r = have; delete rows[key]; const a = anim(r, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 }); const rm = () => r.remove(); a ? (a.onfinish = rm) : rm(); } return; } if (!have) { const r = document.createElement('div'); r.className = 'sum__r'; r.innerHTML = `<dt></dt><dd></dd>`; $('dt', r).textContent = label; $('dd', r).textContent = val; rows[key] = r; dl.appendChild(r); const order = Object.keys(rows); } else if ($('dd', have).textContent !== val) { const dd = $('dd', have); anim(dd, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 }); dd.textContent = val; } }; };

  /* ================= HALL ================= */
  const hall = $('[data-hall]');
  if (hall) {
    const H = t.hall, form = $('[data-form]', hall), steps = $$('.step', hall), rail = $$('[data-rail]', hall), fill = $('.rail__fill', hall), nextB = $('[data-next]', hall), backB = $('[data-back]', hall);
    const S = { date: null, start: '18:00', end: '23:00', guests: 40, layout: 'seated', occ: null, needs: new Set(), name: '', email: '', phone: '', notes: '' };
    let cur = 0, busy = false, view = new Date(); view = new Date(Date.UTC(view.getFullYear(), view.getMonth(), 1));
    const today = (() => { const n = U.nowParts(); return new Date(Date.UTC(n.y, n.mo - 1, n.d)); })();
    const sumUI = sumInit(hall), setLine = lineStore($('[data-lines]', hall));

    /* calendar */
    const cal = $('[data-cal]', hall);
    const renderCal = (dir) => {
      const y = view.getUTCFullYear(), m = view.getUTCMonth(), first = new Date(Date.UTC(y, m, 1)), lead = (first.getUTCDay() + 6) % 7, dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      const minM = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), maxM = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 18, 1));
      const wk = [1, 2, 3, 4, 5, 6, 0].map(d => `<span class="cal__w">${t.days[d]}</span>`).join('');
      let cells = ''; for (let i = 0; i < lead; i++) cells += '<span></span>';
      for (let d = 1; d <= dim; d++) { const dt = new Date(Date.UTC(y, m, d)), past = dt < today, night = [4, 5, 6].includes(dt.getUTCDay()), sel = S.date && +S.date === +dt; cells += `<button type="button" class="cal__d${night ? ' is-night' : ''}${sel ? ' is-sel' : ''}" data-d="${d}" aria-pressed="${!!sel}" aria-label="${fmtDate(dt)}"${past ? ' disabled' : ''}>${d}</button>`; }
      cal.innerHTML = `<div class="cal__h"><button type="button" data-m="-1" aria-label="${t.monthsLong[(m + 11) % 12]}"${view <= minM ? ' disabled' : ''}>‹</button><b>${t.monthsLong[m]} ${y}</b><button type="button" data-m="1" aria-label="${t.monthsLong[(m + 1) % 12]}"${view >= maxM ? ' disabled' : ''}>›</button></div><div class="cal__g">${wk}${cells}</div>`;
      if (dir) anim($('.cal__g', cal), [{ opacity: 0, transform: `translateX(${dir * 16}px)` }, { opacity: 1, transform: 'none' }], { duration: 200, easing: EASE_POUR });
    };
    cal.addEventListener('click', (e) => {
      const mb = e.target.closest('[data-m]'); if (mb) { view = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() + +mb.dataset.m, 1)); renderCal(+mb.dataset.m); const nb = $(`[data-m="${mb.dataset.m}"]`, cal); if (nb && !nb.disabled) nb.focus({ preventScroll: true }); return; }
      const d = e.target.closest('[data-d]'); if (!d || d.disabled) return;
      S.date = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth(), +d.dataset.d)); renderCal(); const nd = $(`[data-d="${d.dataset.d}"]`, cal); if (nd && document.documentElement.dataset.input === 'key') nd.focus({ preventScroll: true }); update();
    });
    /* times */
    const startSel = $('[data-start]', hall), endSel = $('[data-end]', hall);
    const times = (from, to) => { const o = []; for (let x = from; x <= to; x += .5) o.push(hh(x)); return o; };
    const fillTimes = () => { startSel.innerHTML = times(10, 23.5).map(x => `<option${x === S.start ? ' selected' : ''}>${x}</option>`).join(''); const s = parseFloat(S.start) + parseInt(S.start.slice(3)) / 60 - parseFloat(S.start); const sNum = +S.start.slice(0, 2) + (S.start.endsWith('30') ? .5 : 0); const ends = times(sNum + 1, 25); if (!ends.includes(S.end)) S.end = ends.includes('23:00') ? '23:00' : ends[ends.length - 1]; endSel.innerHTML = ends.map(x => `<option${x === S.end ? ' selected' : ''}>${x}</option>`).join(''); };
    startSel.addEventListener('change', () => { S.start = startSel.value; fillTimes(); update(); }); endSel.addEventListener('change', () => { S.end = endSel.value; update(); });
    /* guests */
    const gW = $('[data-guests]', hall), gV = $('[data-val]', gW), warn = $('[data-warn]', hall);
    const setGuests = (d) => { const nv = Math.max(1, Math.min(400, S.guests + d)); if (nv === S.guests) { shake(gW); return; } S.guests = nv; roll(gV, nv, d); update(); };
    holdRepeat($('[data-dec]', gW), () => setGuests(-1)); holdRepeat($('[data-inc]', gW), () => setGuests(1));
    $$('[data-layout]', hall).forEach(b => b.addEventListener('click', () => { S.layout = b.dataset.layout; $$('[data-layout]', hall).forEach(x => x.setAttribute('aria-checked', String(x === b))); update(); }));
    /* occasion + needs */
    $$('[data-occ]', hall).forEach(b => b.addEventListener('click', () => { S.occ = +b.dataset.occ; $$('[data-occ]', hall).forEach(x => x.setAttribute('aria-checked', String(x === b))); update(); }));
    $$('[data-need]', hall).forEach(b => b.addEventListener('click', () => { const i = +b.dataset.need, on = !S.needs.has(i); on ? S.needs.add(i) : S.needs.delete(i); b.setAttribute('aria-checked', String(on)); update(); }));
    $$('[data-f]', form).forEach(i => i.addEventListener('input', () => { S[i.dataset.f] = i.value.trim(); unflag(i); update(); }));

    /* summary + e-mail */
    const lines = () => {
      const need = [...S.needs].sort().map(i => H.needs[i]).join(', ');
      return { date: S.date ? fmtDate(S.date) : '', time: S.date ? `${S.start}–${S.end}` : '', guests: `${S.guests} ${S.layout === 'seated' ? H.seatedWord : H.standingWord}`, occasion: S.occ != null ? H.occ[S.occ] : '', needs: need, contact: [S.name, S.email, S.phone].filter(Boolean).join(' · ') };
    };
    const mailText = () => {
      const L = lines(), M = H.mailLines, out = [H.via, ''];
      if (L.date) out.push(`${M.date}: ${L.date}`, `${M.time}: ${L.time}`); out.push(`${M.guests}: ${L.guests}`); if (L.occasion) out.push(`${M.occasion}: ${L.occasion}`); if (L.needs) out.push(`${M.needs}: ${L.needs}`);
      out.push(''); if (S.name) out.push(`${M.name}: ${S.name}`); if (S.email) out.push(`${M.email}: ${S.email}`); if (S.phone) out.push(`${M.phone}: ${S.phone}`); if (S.notes) out.push('', `${M.notes}: ${S.notes}`);
      const subj = `${H.subject}: ${[L.date.replace(/^[^ ]+ /, ''), L.guests, L.occasion].filter(Boolean).join(', ')}`;
      return { subj, body: out.join('\n') };
    };
    const mailA = $('[data-mail]', hall), copyB = $('[data-copyout]', hall), capEl = $('p', warn);
    function update() {
      const L = lines();
      setLine('date', H.date, L.date); setLine('time', H.time, L.time); setLine('guests', H.guests, L.guests); setLine('occ', H.occasion, L.occasion); setLine('needs', H.needsL, L.needs); setLine('contact', H.contactL, L.contact);
      const over = S.layout === 'seated' ? S.guests > A.hall.seated : S.guests > A.hall.standingHigh;
      capEl.textContent = S.layout === 'seated' ? H.capSeated : H.capStanding; warn.classList.toggle('is-on', over);
      const m = mailText(); mailA.href = `mailto:${A.mail.hall}?subject=${lc(m.subj)}&body=${lc(m.body.replace(/\n/g, '\r\n'))}`;
      sumUI.setBar(`${cur + 1} ${H.of} 5`);
    }
    copyB.addEventListener('click', async () => { const m = mailText(); if (await copyText(`${H.to}: ${A.mail.hall}\n${m.subj}\n\n${m.body}`)) { flashLabel(copyB, H.copied); toast(H.copied); } });
    mailA.addEventListener('click', (e) => { if (!S.name || !/.+@.+\..+/.test(S.email)) { e.preventDefault(); toast(H.required); go(4); const bad = badOf($$('[data-f="name"],[data-f="email"]', form)); bad.forEach(i => flag(i, H.required)); if (bad[0]) setTimeout(() => bad[0].focus(), 440); } });

    /* steps: direction-aware slide, rail fill, focus to the new heading */
    function paintRail() { rail.forEach((r, i) => { r.classList.toggle('is-cur', i === cur); r.classList.toggle('is-done', i < cur); const b = $('button', r); i === cur ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'); }); fill.style.transform = `scaleX(${(cur + 1) / steps.length})`; backB.style.visibility = cur ? 'visible' : 'hidden'; nextB.hidden = cur === steps.length - 1; }
    function go(n, viaPointer = true) {
      if (busy || n === cur || n < 0 || n >= steps.length) return;
      if (n > cur && cur === 0 && !S.date) { toast(H.pick); const c = $('.cal__g', cal); anim(c, [{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 200 }); return; }
      const dir = n > cur ? 1 : -1, from = steps[cur], to = steps[n]; cur = n; busy = true; paintRail();
      const swap = () => { from.hidden = true; to.hidden = false; const h = $('.h2', to); h && h.focus({ preventScroll: true }); anim(to, [{ opacity: 0, transform: `translateX(${28 * dir}px)` }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE_POUR }); busy = false; update(); const top = hall.getBoundingClientRect().top; if (top < 0) scrollTo({ top: scrollY + top - 80, behavior: reduce.matches ? 'auto' : 'smooth' }); };
      const a = anim(from, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-28 * dir}px)` }], { duration: 160, easing: EASE_IO }); a ? (a.onfinish = swap) : swap();
    }
    nextB.addEventListener('click', () => go(cur + 1)); backB.addEventListener('click', () => go(cur - 1)); rail.forEach((r, i) => $('button', r).addEventListener('click', () => go(i)));
    form.addEventListener('submit', (e) => e.preventDefault());
    fillTimes(); renderCal(); paintRail(); update();
  }

  /* ================= TRADE ================= */
  const trade = $('[data-trade]');
  if (trade) {
    const R = t.trade, form = $('[data-form]', trade), sumUI = sumInit(trade), linesEl = $('[data-lines]', trade), totalEl = $('[data-total]', trade), refEl = $('[data-ref]', trade), needEl = $('[data-need]', trade);
    const V = { venue: '', contact: '', email: '', phone: '', address: '', notes: '' }, Q = {}, MAXQ = 99, VK = 'aegir.venue.v1';
    let week = null, ref = null, remember = false;
    A.beers.forEach(b => { Q[b.slug] = { keg: 0, case: 0 }; });
    /* delivery weeks: next six Mondays after today */
    const weeks = $('[data-weeks]', trade); (() => { const n = U.nowParts(), d0 = new Date(Date.UTC(n.y, n.mo - 1, n.d)); let add = (8 - d0.getUTCDay()) % 7 || 7; const out = []; for (let i = 0; i < 6; i++) out.push(new Date(Date.UTC(n.y, n.mo - 1, n.d + add + i * 7))); weeks.innerHTML = out.map((d, i) => `<button type="button" role="radio" aria-checked="false" class="chipb" data-w="${d.toISOString().slice(0, 10)}">${R.weekOf} ${d.getUTCDate()}${is ? '.' : ''} ${t.months[d.getUTCMonth()]}</button>`).join(''); })();
    weeks.addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (!b) return; week = b.dataset.w; $$('[data-w]', weeks).forEach(x => x.setAttribute('aria-checked', String(x === b))); update(); });
    /* venue fields + remember */
    const saved = store.get(VK, null); const rem = $('[data-remember]', trade);
    $$('[data-f]', form).forEach(i => { if (saved && saved[i.dataset.f] != null && i.dataset.f !== 'notes') i.value = V[i.dataset.f] = saved[i.dataset.f]; i.addEventListener('input', () => { V[i.dataset.f] = i.value.trim(); unflag(i); if (remember) persist(); update(); }); });
    const persist = () => store.set(VK, { venue: V.venue, contact: V.contact, email: V.email, phone: V.phone, address: V.address });
    if (saved) { remember = true; rem.setAttribute('aria-checked', 'true'); }
    rem.addEventListener('click', () => { remember = !remember; rem.setAttribute('aria-checked', String(remember)); if (remember) { persist(); toast(R.remember); } else { try { localStorage.removeItem(VK); } catch (e) { /* ignore */ } } });
    /* steppers */
    $$('.ord', trade).forEach(row => $$('.qty[data-qty]', row).forEach(q => {
      const kind = q.dataset.qty, out = $('[data-val]', q), slug = row.dataset.slug;
      const bump = (d) => { const cur = Q[slug][kind], nv = Math.max(0, Math.min(MAXQ, cur + d)); if (nv === cur) { shake(q); return; } Q[slug][kind] = nv; roll(out, nv, d); q.classList.toggle('is-on', nv > 0); if (!ref && nv > 0) mkRef(); update(); };
      holdRepeat($('[data-dec]', q), () => bump(-1)); holdRepeat($('[data-inc]', q), () => bump(1));
    }));
    const mkRef = () => { const n = U.nowParts(); ref = `AEG-${String(n.y).slice(2)}${pad(n.mo)}${pad(n.d)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; };
    const totals = () => { let k = 0, c = 0; const lines = []; A.beers.forEach(b => { const q = Q[b.slug]; k += q.keg; c += q.case; if (q.keg || q.case) lines.push({ b, q }); }); return { k, c, lines }; };
    const lineText = (q) => [q.keg ? `${q.keg} × ${R.keg}` : '', q.case ? `${q.case} × ${R.case}` : ''].filter(Boolean).join(' · ');
    const rendered = new Map();
    const mailText = () => {
      const T = totals(), M = R.mailLines, out = [R.via, '', `${M.ref}: ${ref || '—'}`, '', `${M.venue}: ${V.venue}`, V.contact ? `${M.contact}: ${V.contact}` : '', `${M.email}: ${V.email}`, V.phone ? `${M.phone}: ${V.phone}` : '', V.address ? `${M.address}: ${V.address}` : '', `${M.week}: ${week ? new Date(week + 'T00:00:00Z').getUTCDate() + (is ? '. ' : ' ') + t.monthsLong[new Date(week + 'T00:00:00Z').getUTCMonth()] : '—'}`, ''].filter(x => x !== '' || true);
      T.lines.forEach(({ b, q }) => out.push(`${b.name} (${b.style}): ${lineText(q)}`)); out.push('', `${R.total}: ${T.k} ${R.kegs} · ${T.c} ${R.cases}`); if (V.notes) out.push('', `${M.notes}: ${V.notes}`);
      return { subj: `${R.subject} ${ref || ''}: ${V.venue || ''}`.trim(), body: out.join('\n').replace(/\n{3,}/g, '\n\n') };
    };
    const mailA = $('[data-mail]', trade), copyB = $('[data-copyout]', trade);
    function update() {
      const T = totals(); refEl.textContent = ref || '—';
      /* order lines enter and leave (240 ms) */
      const keep = new Set(T.lines.map(l => l.b.slug));
      T.lines.forEach(({ b, q }) => { let li = rendered.get(b.slug); if (!li) { li = document.createElement('li'); li.innerHTML = '<span></span><span></span>'; $('span', li).textContent = b.name; rendered.set(b.slug, li); linesEl.appendChild(li); anim(li, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: EASE_POUR }); } const v = $('span:last-child', li), nt = lineText(q); if (v.textContent !== nt) { if (v.textContent) anim(v, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 }); v.textContent = nt; } });
      [...rendered].forEach(([slug, li]) => { if (!keep.has(slug)) { rendered.delete(slug); const a = anim(li, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }); a ? (a.onfinish = () => li.remove()) : li.remove(); } });
      if (!T.lines.length && !linesEl.querySelector('.sum__empty')) { /* placeholder text lives in the total line */ }
      totalEl.textContent = T.lines.length ? `${R.total}: ${T.k} ${R.kegs} · ${T.c} ${R.cases}` : R.empty;
      const okVenue = V.venue && /.+@.+\..+/.test(V.email), ok = okVenue && T.lines.length;
      needEl.textContent = !T.lines.length ? R.needBeers : (!okVenue ? R.needVenue : '');
      mailA.setAttribute('aria-disabled', String(!ok)); const m = mailText(); mailA.href = `mailto:${A.mail.trade}?subject=${lc(m.subj)}&body=${lc(m.body.replace(/\n/g, '\r\n'))}`;
      sumUI.setBar(T.lines.length ? `${T.k + T.c}` : '0');
    }
    mailA.addEventListener('click', (e) => { if (mailA.getAttribute('aria-disabled') === 'true') { e.preventDefault(); toast(needEl.textContent); const bad = badOf($$('[data-f="venue"],[data-f="email"]', form)); bad.forEach(i => flag(i, R.needVenue)); if (bad[0]) bad[0].focus(); } });
    copyB.addEventListener('click', async () => { const m = mailText(); if (await copyText(`${R.toL}: ${A.mail.trade}\n${m.subj}\n\n${m.body}`)) { flashLabel(copyB, R.copied); toast(R.copied); } });
    form.addEventListener('submit', (e) => e.preventDefault());
    /* ?beer=slug from a beer page adds one keg and scrolls to it */
    const pre = new URLSearchParams(location.search).get('beer'); if (pre && Q[pre]) { const row = $(`.ord[data-slug="${pre}"]`, trade); if (row) { const q = $('[data-qty="keg"]', row); Q[pre].keg = 1; $('[data-val]', q).textContent = '1'; q.classList.add('is-on'); mkRef(); setTimeout(() => row.scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' }), 400); } }
    update();
  }

  /* ================= STAFF ================= */
  const staff = $('[data-staff]');
  if (staff) {
    const St = t.staff, TAPS_KEY = U.TAPS_KEY, EV_KEY = U.EV_KEY, HK = 'aegir.hours.v1';
    const saved = () => toast(St.saved);
    /* tabs */
    const tabs = $$('[data-tab]', staff), panels = $$('.tpanel', staff);
    const showTab = (i, focus) => { tabs.forEach((x, j) => { x.setAttribute('aria-selected', String(i === j)); x.tabIndex = i === j ? 0 : -1; }); panels.forEach((p, j) => { if (j === i) { p.hidden = false; anim(p, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: EASE_POUR }); } else p.hidden = true; }); if (focus) tabs[i].focus(); };
    tabs.forEach((tb, i) => { tb.addEventListener('click', () => showTab(i)); tb.addEventListener('keydown', (e) => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (k) { e.preventDefault(); showTab((i + k + tabs.length) % tabs.length, true); } }); });
    /* taps */
    let door = 'd101'; const rows = $('[data-srows]', staff);
    const opts = (d) => `<option value="">—</option>${d === 'd220' ? `<option value="cocktail">${t.board.cocktail}</option>` : ''}${A.beers.map(b => `<option value="${b.slug}">${b.name} (${b.style})</option>`).join('')}`;
    const renderRows = () => { const cur = U.tapsFor(door); rows.innerHTML = cur.map((x, i) => `<li class="srow"><b>${i + 1}</b><label><span class="sr">${St.beerL} ${i + 1}</span><select data-i="${i}">${opts(door)}</select></label><label class="k"><input type="checkbox" data-k="${i}"${x.k ? ' checked' : ''}>${St.kickedL}</label></li>`).join(''); $$('select', rows).forEach((s, i) => { s.value = cur[i].s || ''; }); };
    const writeTaps = () => { const all = store.get(TAPS_KEY, {}) || {}; const cur = $$('.srow', rows).map(li => ({ s: $('select', li).value, k: $('input', li).checked ? 1 : 0 })); all[door] = cur; ['d101', 'd220'].forEach(d => { if (!all[d]) all[d] = A.taps[d].map(s => ({ s, k: 0 })); }); store.set(TAPS_KEY, all); saved(); };
    rows.addEventListener('change', writeTaps);
    $$('[data-sdoor]', staff).forEach(b => b.addEventListener('click', () => { door = b.dataset.sdoor; $$('[data-sdoor]', staff).forEach(x => x.setAttribute('aria-checked', String(x === b))); renderRows(); }));
    $('[data-reset]', staff).addEventListener('click', () => { if (!confirm(`${St.reset}?`)) return; try { localStorage.removeItem(TAPS_KEY); } catch (e) { /* ignore */ } renderRows(); saved(); });
    renderRows();
    /* events */
    const evForm = $('[data-evform]', staff), evList = $('[data-evmine]', staff), evNone = $('[data-evnone]', staff);
    const renderMine = () => { const mine = store.get(EV_KEY, []) || []; evNone.hidden = mine.length > 0; evList.innerHTML = ''; mine.forEach(e => { const [y, m, d] = e.date.split('-').map(Number); const li = document.createElement('li'); li.className = 'ev'; li.style.setProperty('--light', `var(--${e.door})`); li.innerHTML = `<time class="ev__d"><b>${d}</b><span>${t.months[m - 1]}</span></time><div class="ev__b"><h3></h3><p>${e.time} ${t.events.at} <span class="ev__door">${A.doors[e.door].name}</span></p></div><button type="button" class="ev__rm" data-rm="${e.id}">${St.evRemove}</button>`; $('h3', li).textContent = e.title; evList.appendChild(li); }); };
    evForm.addEventListener('submit', (e) => { e.preventDefault(); const f = (k) => $(`[data-f="${k}"]`, evForm); const ev = { id: 'm' + Date.now(), title: f('title').value.trim(), door: f('door').value, date: f('date').value, time: f('time').value || '20:00' }; if (!ev.title || !ev.date) { const bad = [f('title'), f('date')].filter(i => !i.value.trim()); bad.forEach(i => flag(i, t.hall.required)); if (bad[0]) bad[0].focus(); return; } $$('.is-bad', evForm).forEach(unflag); const all = store.get(EV_KEY, []) || []; all.push(ev); store.set(EV_KEY, all); f('title').value = ''; renderMine(); saved(); });
    evList.addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (!b) return; if (!confirm(`${St.evRemove}?`)) return; const li = b.closest('.ev'); const all = (store.get(EV_KEY, []) || []).filter(x => x.id !== b.dataset.rm); store.set(EV_KEY, all); const a = anim(li, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }); a ? (a.onfinish = renderMine) : renderMine(); });
    renderMine();
    /* tonight's hours */
    const n = U.nowParts(), dk = `${n.y}-${n.mo}-${n.d}`; const cur = store.get(HK, {}) || {};
    $$('[data-hdoor]', staff).forEach(row => {
      const d = row.dataset.hdoor, sel = $('[data-hsel]', row), tm = $('[data-htime]', row), o = cur.date === dk ? cur[d] : null;
      if (o) { sel.value = String(o.mode); if (o.until != null) tm.value = hh(o.until); }
      const sync = () => { tm.disabled = !(sel.value === '2' || sel.value === '3'); tm.closest('.fld').style.opacity = tm.disabled ? .45 : 1; };
      const write = () => { const all = store.get(HK, {}) || {}; if (all.date !== dk) { for (const k of Object.keys(all)) delete all[k]; all.date = dk; } const mode = +sel.value; if (!mode) delete all[d]; else { const [h, m] = (tm.value || '23:00').split(':').map(Number); let until = h + m / 60; if (until < 6) until += 24; all[d] = { mode, until: mode > 1 ? until : null }; } store.set(HK, all); sync(); saved(); };
      sel.addEventListener('change', write); tm.addEventListener('change', write); sync();
    });
  }
})();
