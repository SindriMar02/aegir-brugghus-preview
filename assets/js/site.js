/* ÆGIR Brugghús prototype: shared behaviour. Vanilla; every enhancement leaves the static HTML usable.
   Spec: _docs/aegir-brugghus-2026-11-06/MOTION.md (row numbers in comments). Reads window.AEGIR (assets/js/data-<lang>.js). */
(() => {
  'use strict';
  const A = window.AEGIR; if (!A) return;
  const html = document.documentElement, body = document.body;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = body.dataset.root || '';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE_POUR = 'cubic-bezier(.16,1,.3,1)', EASE_IO = 'cubic-bezier(.65,0,.35,1)';
  const t = A.t;
  html.classList.add('js-ready');
  const pad = (n) => String(n).padStart(2, '0');
  const hh = (n) => pad(Math.floor(n) % 24) + ':' + pad(Math.round((n % 1) * 60));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: demo state stays in memory only */ } },
  };
  window.AEGIR_UTIL = { $, $$, pad, hh, store, reduce, EASE_POUR, EASE_IO };

  /* ---------- Reykjavik clock + status ---------- */
  const fmtP = new Intl.DateTimeFormat('en-GB', { timeZone: A.tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric' });
  const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const nowParts = (d = new Date()) => { const p = {}; fmtP.formatToParts(d).forEach(x => { p[x.type] = x.value; }); return { dow: DOW[p.weekday], h: +p.hour, m: +p.minute, y: +p.year, mo: +p.month, d: +p.day }; };
  const dayKey = (n) => `${n.y}-${n.mo}-${n.d}`;
  window.AEGIR_UTIL.nowParts = nowParts;
  const nextOpen = (door, n, skipToday) => {
    for (let i = skipToday ? 1 : 0; i <= 7; i++) { const dd = (n.dow + i) % 7, w = door.week[dd]; if (w && (i > 0 || n.h + n.m / 60 < w[0])) return { dow: dd, at: w[0], today: i === 0 }; }
    return null;
  };
  const statusOf = (door, d = new Date()) => {
    if (!door.week) return { state: 'arr' };
    const n = nowParts(d), tm = n.h + n.m / 60;
    const ov = (store.get('aegir.hours.v1', {}) || {});
    const o = ov.date === dayKey(n) && ov[door.id] ? ov[door.id] : null;
    const yw = door.week[(n.dow + 6) % 7];
    if (yw && yw[1] > 24 && tm < yw[1] - 24) return { state: 'open', closes: yw[1] - 24 };
    let w = door.week[n.dow] ? door.week[n.dow].slice() : null;
    if (o && o.mode === 1) return { state: 'closed', next: nextOpen(door, n, true), override: true };
    if (o && o.mode === 2 && w && o.until != null) w[1] = Math.min(w[1], o.until);
    if (o && o.mode === 3 && o.until != null) { if (!w) w = [17, o.until]; else w[1] = Math.max(w[1], o.until); }
    if (w && tm >= w[0] && tm < w[1]) return { state: 'open', closes: w[1], override: !!o };
    return { state: 'closed', next: nextOpen(door, o && o.mode === 2 ? { ...n, h: 99, m: 0 } : n, o && o.mode === 2 && tm >= w[1] ? true : false), override: !!o };
  };
  const chipText = (door, st) => {
    const s = t.status;
    if (st.state === 'arr') return s.arr;
    if (st.state === 'open') return `${s.open} · ${s.closes} ${hh(st.closes)}`;
    if (!st.next) return s.closed;
    return `${s.closed} · ${s.opens} ${st.next.today ? s.today : t.days[st.next.dow]} ${hh(st.next.at)}`;
  };
  window.AEGIR_UTIL.statusOf = statusOf;

  /* 5. status chips, hero block and top bar (dot pulses only while open) */
  const chips = $$('[data-chip]'), topbar = $('[data-topbar]');
  const chipParts = (door, st) => { const s = t.status; if (st.state === 'arr') return [s.arr, '']; if (st.state === 'open') return [s.open, `${s.closes} ${hh(st.closes)}`]; if (!st.next) return [s.closed, '']; return [s.closed, `${s.opens} ${st.next.today ? s.today : t.days[st.next.dow]} ${hh(st.next.at)}`]; };
  const paintChips = (first) => {
    chips.forEach(c => {
      const d = A.doors[c.dataset.chip], st = statusOf(d), txt = chipText(d, st), el = $('.chip__t', c), big = $('.blk__a', c), sub = $('.blk__b', c);
      c.classList.toggle('is-open', st.state === 'open');
      c.classList.toggle('is-closed', st.state === 'closed');
      if (big) {
        const [a, b2] = chipParts(d, st);
        if (big.textContent !== a || sub.textContent !== b2) { if (first || reduce.matches) { big.textContent = a; sub.textContent = b2; } else { c.classList.add('is-swap'); setTimeout(() => { big.textContent = a; sub.textContent = b2; c.classList.remove('is-swap'); }, 160); } }
        if (el) el.textContent = txt;
      } else if (el.textContent !== txt) {
        if (first || reduce.matches) el.textContent = txt;
        else { c.classList.add('is-swap'); setTimeout(() => { el.textContent = txt; c.classList.remove('is-swap'); }, 160); }
      }
      c.setAttribute('aria-label', `${d.short}: ${txt}`);
    });
    if (topbar) { const parts = ['d101', 'd220'].map(id => `${A.doors[id].name} ${chipText(A.doors[id], statusOf(A.doors[id]))}`); topbar.firstElementChild.textContent = parts.join('   |   '); }
  };
  paintChips(true);
  window.AEGIR_UTIL.paintChips = paintChips;
  setInterval(() => { if (!document.hidden) paintChips(false); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paintChips(false); });
  addEventListener('storage', (e) => { if (e.key === 'aegir.hours.v1') { paintChips(false); markToday(); } });

  /* hours lists: highlight today */
  function markToday() { const n = nowParts(); $$('.hrs li[data-days]').forEach(li => li.classList.toggle('is-today', li.dataset.days.split(',').map(Number).includes(n.dow))); }
  markToday();

  /* ---------- toast + copy ---------- */
  const toastEl = $('[data-toast]'); let toastT;
  const toast = (m) => { toastEl.textContent = m; toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2400); };
  const copyText = async (txt) => { try { await navigator.clipboard.writeText(txt); return true; } catch (e) { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ } ta.remove(); return ok; } };
  window.AEGIR_UTIL.toast = toast; window.AEGIR_UTIL.copyText = copyText;
  const flashLabel = (btn, txt) => { const old = btn.dataset.l || btn.textContent; btn.dataset.l = old; btn.textContent = txt; clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = old; }, 1600); };
  window.AEGIR_UTIL.flashLabel = flashLabel;
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    if (await copyText(b.dataset.copy)) { flashLabel(b, t.home.copied); toast(t.home.copied); }
  });

  /* ---------- header solid on scroll (4) ---------- */
  const bar = $('[data-bar]');
  if (bar) { let tick = false; const f = () => { bar.classList.toggle('is-solid', scrollY > 40); tick = false; }; addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(f); } }, { passive: true }); f(); }

  /* ---------- overlay helper: scroll lock + focus-guard + Esc + trap ---------- */
  let lockCount = 0;
  const lock = () => { if (lockCount++ === 0) { body.dataset.sy = scrollY; body.classList.add('is-locked'); } };
  const unlock = () => { if (--lockCount <= 0) { lockCount = 0; body.classList.remove('is-locked'); } };
  const focusables = (el) => $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', el).filter(x => x.offsetParent !== null || x === document.activeElement);
  const trap = (el, e) => { if (e.key !== 'Tab') return; const f = focusables(el); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && (document.activeElement === a || document.activeElement === el)) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } };

  /* ---------- 6. mobile drawer ---------- */
  const drawer = $('[data-drawer]'), burger = $('[data-burger]');
  if (drawer && burger) {
    let timer, viaKey = false, open = false;
    const openD = (e) => {
      if (open) return; open = true; viaKey = !e || e.detail === 0; clearTimeout(timer);
      drawer.hidden = false; void drawer.offsetWidth; drawer.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true'); lock();
      (viaKey ? (focusables(drawer)[0] || drawer) : drawer).focus({ preventScroll: true });
    };
    const closeD = () => {
      if (!open) return; open = false; drawer.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); unlock();
      timer = setTimeout(() => { drawer.hidden = true; }, reduce.matches ? 0 : 300);
      if (viaKey) burger.focus({ preventScroll: true });
    };
    burger.addEventListener('click', (e) => (open ? closeD() : openD(e)));
    $('[data-drawer-close]', drawer).addEventListener('click', closeD);
    drawer.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeD(); else trap(drawer, e); });
    drawer.addEventListener('click', (e) => { if (e.target.closest('a')) closeD(); });
    matchMedia('(min-width: 900px)').addEventListener('change', (m) => { if (m.matches) closeD(); });
  }

  /* ---------- 8. info sheet (hours, address, directions) ---------- */
  const sheet = $('[data-sheet]');
  let bd = null, sheetTrigger = null, sheetViaKey = false, sheetOpen = false, sheetTimer;
  const groups = (door) => { const order = [1, 2, 3, 4, 5, 6, 0], out = []; let i = 0; const k = (d) => (door.week[d] ? door.week[d].join('-') : 'x'); while (i < 7) { let j = i; while (j + 1 < 7 && k(order[j + 1]) === k(order[i])) j++; const w = door.week[order[i]]; out.push({ label: i === j ? t.days[order[i]] : `${t.days[order[i]]}–${t.days[order[j]]}`, w, days: order.slice(i, j + 1) }); i = j + 1; } return out; };
  const sheetHTML = (id) => {
    const d = A.doors[id], st = statusOf(d), S = t.sheet, n = nowParts();
    const sline = st.state === 'arr' ? S.byArr : `<b>${chipText(d, st).split(' · ')[0]}</b>${chipText(d, st).includes(' · ') ? ' · ' + chipText(d, st).split(' · ').slice(1).join(' · ') : ''}`;
    const rows = d.week ? `<ul class="hrs">${groups(d).map(g => `<li class="${g.days.includes(n.dow) ? 'is-today' : ''}"><span>${g.label}</span><span>${g.w ? hh(g.w[0]) + '–' + hh(g.w[1]) : (id === 'd220' ? t.status.events : S.closedDay)}</span></li>`).join('')}${d.kitchen ? `<li><span>${S.kitchen}</span><span>${hh(d.kitchen.open)}–${hh(d.kitchen.close)} <span class="tbc">${S.kitchenTbc}</span></span></li>` : ''}</ul>` : '';
    return `<button class="sheet__x" type="button" data-sheet-x aria-label="${S.close}"><span></span><span></span></button><h3 id="sheet-h">${d.name}</h3><p class="sheet__st">${sline}</p>${rows}<address>${d.street}, ${d.zip} ${d.city}</address><div class="find"><a class="btn btn--ghost" href="${d.maps}" target="_blank" rel="noopener">${S.directions}</a><button class="btn btn--ghost" type="button" data-copy="${d.street}, ${d.zip} ${d.city}">${S.copy}</button></div><a href="mailto:${d.email}">${d.email}</a>`;
  };
  const place = (trig) => {
    if (matchMedia('(max-width: 899px)').matches) return;
    const r = trig.getBoundingClientRect(), w = Math.min(380, innerWidth - 24); sheet.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + 'px';
    const h = sheet.offsetHeight || 340; let top = r.bottom + 8; if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - 8); sheet.style.top = top + 'px';
  };
  const openSheet = (id, trig, e) => {
    clearTimeout(sheetTimer); sheetTrigger = trig; sheetViaKey = !e || e.detail === 0;
    sheet.innerHTML = sheetHTML(id); sheet.setAttribute('aria-labelledby', 'sheet-h'); sheet.style.setProperty('--light', `var(--${A.doors[id].id === 'brewery' ? 'grandi' : id})`);
    if (!bd) { bd = document.createElement('div'); bd.className = 'sheet-bd'; bd.addEventListener('click', closeSheet); document.body.appendChild(bd); }
    bd.hidden = false; sheet.hidden = false; place(trig); void sheet.offsetWidth;
    sheet.classList.add('is-open'); bd.classList.add('is-on'); if (!sheetOpen) { sheetOpen = true; if (matchMedia('(max-width: 899px)').matches) lock(); }
    (sheetViaKey ? (focusables(sheet)[1] || sheet) : sheet).focus({ preventScroll: true });
  };
  function closeSheet() {
    if (!sheetOpen) return; sheetOpen = false; sheet.classList.remove('is-open'); bd && bd.classList.remove('is-on');
    if (matchMedia('(max-width: 899px)').matches) unlock();
    sheetTimer = setTimeout(() => { sheet.hidden = true; if (bd) bd.hidden = true; }, reduce.matches ? 0 : 300);
    if (sheetViaKey && sheetTrigger) sheetTrigger.focus({ preventScroll: true });
  }
  if (sheet) {
    sheet.addEventListener('click', (e) => { if (e.target.closest('[data-sheet-x]')) closeSheet(); });
    sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); else trap(sheet, e); });
    document.addEventListener('click', (e) => { const c = e.target.closest('[data-chip]'); if (c) { e.preventDefault(); sheetOpen && sheetTrigger === c ? closeSheet() : openSheet(c.dataset.chip, c, e); } });
    addEventListener('resize', () => { if (sheetOpen) place(sheetTrigger); });
  }

  /* ---------- 16/31/29. scroll reveals ---------- */
  const reveals = $$('[data-reveal]');
  if (reveals.length) {
    $$('[data-reveal-group]').forEach(g => { $$('[data-reveal]', g).forEach((el, i) => el.style.setProperty('--rd', Math.min(i, 5) * 70 + 'ms')); });
    if ('IntersectionObserver' in window && !reduce.matches) {
      const io = new IntersectionObserver((es) => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
      reveals.forEach(el => io.observe(el));
    } else reveals.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- 19. FAQ expand and collapse ---------- */
  $$('[data-faq]').forEach(f => f.addEventListener('click', (e) => { const q = e.target.closest('.faq__q'); if (!q) return; const it = q.closest('.faq__i'), on = !it.classList.contains('is-open'); it.classList.toggle('is-open', on); q.setAttribute('aria-expanded', String(on)); }));

  /* ---------- tap data (sample, or what the staff view saved in this browser) ---------- */
  const beerBy = (s) => A.beers.find(b => b.slug === s);
  const TAPS_KEY = 'aegir.taps.v1';
  const tapsFor = (door) => { const o = store.get(TAPS_KEY, null); const base = A.taps[door].map(s => ({ s, k: 0 })); return o && o[door] ? o[door] : base; };
  const rowHTML = (x, i, isStatic) => {
    const n = i + 1;
    if (x.s === 'cocktail') return `<li class="tap tap--cocktail${x.k ? ' is-kicked' : ''}${isStatic ? ' is-static' : ''}" data-slug="cocktail"><span class="tap__n">${n}</span><span class="tap__can tap__can--type">—</span><span class="tap__name">${t.board.cocktail}</span><span class="tap__style">${t.board.cocktailNote}</span><span class="tap__state"></span></li>`;
    if (!x.s) return `<li class="tap tap--empty${isStatic ? ' is-static' : ''}"><span class="tap__n">${n}</span><span class="tap__can tap__can--type">·</span><span class="tap__name" style="color:var(--faint)">${t.board.none}</span><span class="tap__style"></span><span class="tap__state"></span></li>`;
    const b = beerBy(x.s); if (!b) return '';
    const can = b.art ? `<img class="tap__can" src="${root}assets/img/${b.art}-160.webp" width="33" height="56" alt="" loading="lazy" decoding="async">` : `<span class="tap__can tap__can--type">${b.style.slice(0, 3).toUpperCase()}</span>`;
    return `<li class="tap${x.k ? ' is-kicked' : ''}${isStatic ? ' is-static' : ''}" data-slug="${b.slug}"><span class="tap__n">${n}</span>${can}<a class="tap__name" href="${root}${A.href.beer}${b.slug}/" translate="no">${b.name}</a><span class="tap__style">${b.style}</span><span class="tap__state"></span></li>`;
  };
  window.AEGIR_UTIL.tapsFor = tapsFor; window.AEGIR_UTIL.TAPS_KEY = TAPS_KEY;

  let tapLine = null; /* set below by the home board-row reveal; the boards call tapLine.sync() after re-rendering */
  /* ---------- 10/11. board: tabs, swap, staff-set state ---------- */
  const boards = $$('[data-board]').map(el => {
    const doors = el.dataset.board.split(','), tabs = $$('.board__tab', el), panels = $$('.board__panel', el), ink = $('.board__ink', el);
    const inHome = !!el.closest('[data-tonight]');
    let cur = doors[0], timer = 0;
    const panelOf = (d) => panels.find(p => p.dataset.door === d);
    const render = (d, flash) => { const ol = $('.taps', panelOf(d)), prev = [...ol.children].map(li => li.dataset.slug + (li.classList.contains('is-kicked') ? 'k' : '')); ol.innerHTML = tapsFor(d).map((x, i) => rowHTML(x, i, !inHome || !!(tapLine && tapLine.seen))).join(''); if (flash) [...ol.children].forEach((li, i) => { if (prev[i] !== li.dataset.slug + (li.classList.contains('is-kicked') ? 'k' : '')) li.classList.add('is-changed'); }); if (inHome) tapLine && tapLine.sync(); };
    const positionInk = () => { if (!ink) return; const i = doors.indexOf(cur); ink.style.width = (100 / doors.length) + '%'; ink.style.transform = `translateX(${i * 100}%)`; ink.style.background = `var(--${cur === 'brewery' ? 'grandi' : cur})`; };
    const rowsIn = (p) => { if (reduce.matches) return; $$('.tap', p).forEach((r, i) => { r.animate([{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: r.classList.contains('is-kicked') ? .45 : 1, transform: 'none' }], { duration: 320, delay: i * 30, easing: EASE_POUR, fill: 'backwards' }); }); };
    const show = (d, focus) => {
      if (d === cur && !panelOf(d).hidden) return;
      clearTimeout(timer); el.getAnimations({ subtree: true }).forEach(a => a.cancel());
      const from = panels.find(p => !p.hidden), to = panelOf(d); cur = d;
      tabs.forEach(tb => { const on = tb.dataset.door === d; tb.setAttribute('aria-selected', String(on)); tb.tabIndex = on ? 0 : -1; });
      positionInk(); if (focus) tabs.find(tb => tb.dataset.door === d).focus();
      const enter = () => { panels.forEach(p => { p.hidden = p !== to; }); render(d); rowsIn(to); if (inHome) tapLine && tapLine.sync(true); };
      if (from && from !== to && !reduce.matches) { $$('.tap', from).forEach((r, i) => r.animate([{ opacity: r.classList.contains('is-kicked') ? .45 : 1, transform: 'none' }, { opacity: 0, transform: 'translateY(8px)' }], { duration: 140, delay: i * 20, easing: EASE_IO, fill: 'forwards' })); timer = setTimeout(enter, 140 + 9 * 20 + 10); } else enter();
    };
    tabs.forEach((tb, i) => { tb.addEventListener('click', () => show(tb.dataset.door)); tb.addEventListener('keydown', (e) => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (k) { e.preventDefault(); show(doors[(i + k + doors.length) % doors.length], true); } if (e.key === 'Home') { e.preventDefault(); show(doors[0], true); } if (e.key === 'End') { e.preventDefault(); show(doors[doors.length - 1], true); } }); });
    positionInk();
    if (store.get(TAPS_KEY, null)) doors.forEach(d => render(d));
    addEventListener('storage', (e) => { if (e.key === TAPS_KEY) doors.forEach(d => render(d, true)); });
    return { el, doors, render };
  });

  /* ---------- 8. board rows pour in when the black section enters (tied to viewport entry, 60 ms stagger) ---------- */
  const tonight = $('[data-tonight]');
  if (tonight) {
    const showRows = (scope) => $$('.tap', scope).forEach((r, i) => { r.style.setProperty('--rd', Math.min(i, 9) * 60 + 'ms'); r.classList.add('is-in'); });
    const bd = $('.board', tonight); let seen = reduce.matches;
    if ('IntersectionObserver' in window && !seen) { const io = new IntersectionObserver((es) => es.forEach(x => { if (x.isIntersecting) { seen = true; showRows(bd); io.disconnect(); } }), { threshold: .12 }); io.observe(bd); } else { seen = true; showRows(bd); }
    tapLine = { get seen() { return seen; }, sync() { if (seen) requestAnimationFrame(() => showRows(bd)); } };
  }

  /* ---------- 10. can slider: native scroll-snap, hand-driven arrows, keyboard, live counter ---------- */
  $$('[data-slider]').forEach(sl => {
    const track = $('[data-track]', sl), prev = $('[data-prev]', sl), next = $('[data-next]', sl), n = $('[data-n]', sl), slides = $$('.slide', track);
    const idx = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    let target = 0, settle = 0;
    const upd = () => { const i = idx(); n.textContent = `${pad(i + 1)} / ${pad(slides.length)}`; prev.disabled = i <= 0; next.disabled = i >= slides.length - 1; };
    const go = (i) => { i = Math.max(0, Math.min(slides.length - 1, i)); target = i; track.scrollTo({ left: i * track.clientWidth, behavior: reduce.matches ? 'auto' : 'smooth' }); };
    let raf = 0; track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; upd(); }); clearTimeout(settle); settle = setTimeout(() => { target = idx(); }, 140); }, { passive: true });
    prev.addEventListener('click', () => go(target - 1)); next.addEventListener('click', () => go(target + 1));
    track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(target + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(target - 1); } });
    addEventListener('resize', () => go(target)); upd();
  });


  /* ---------- door sub-nav: current section follows the scroll (aria-current="location") ---------- */
  const dn = $('[data-dnav]');
  if (dn && 'IntersectionObserver' in window) {
    const links = $$('[data-spy]', dn), byId = new Map(links.map(a => [a.dataset.spy, a])), scroller = $('.dnav__in', dn);
    const io = new IntersectionObserver((es) => es.forEach(e => { if (!e.isIntersecting) return; const a = byId.get(e.target.id); if (!a) return; links.forEach(x => x.removeAttribute('aria-current')); a.setAttribute('aria-current', 'location'); if (scroller && scroller.scrollWidth > scroller.clientWidth) scroller.scrollTo({ left: a.offsetLeft - 140, behavior: reduce.matches ? 'auto' : 'smooth' }); }), { rootMargin: '-35% 0px -60% 0px' });
    links.map(a => document.getElementById(a.dataset.spy)).filter(Boolean).forEach(sec => io.observe(sec));
  }

  /* ---------- 12/13. beers page filter ---------- */
  const grid = $('[data-grid]');
  if (grid) {
    const tiles = $$('.tile', grid), chipsF = $$('.fchip[data-fam]'), count = $('[data-count]');
    chipsF.forEach(c => c.addEventListener('click', () => {
      const fam = c.dataset.fam; chipsF.forEach(x => x.setAttribute('aria-pressed', String(x === c))); history.replaceState(null, '', fam === 'all' ? location.pathname + location.search : '#' + fam);
      let n = 0;
      tiles.forEach(tl => { const show = fam === 'all' || tl.dataset.fam === fam; if (show) n++; clearTimeout(tl._t);
        if (reduce.matches) { tl.hidden = !show; return; }
        if (show) { tl.hidden = false; tl.classList.add('is-out'); requestAnimationFrame(() => requestAnimationFrame(() => tl.classList.remove('is-out'))); }
        else { tl.classList.add('is-out'); tl._t = setTimeout(() => { tl.hidden = true; }, 160); } });
      count.textContent = `${n} ${t.beers.countWord}`;
    }));
    { const hc = chipsF.find(x => x.dataset.fam === location.hash.slice(1)); if (hc) hc.click(); }
  }

  /* ---------- events: next occurrence from today, plus what staff added in this browser ---------- */
  const EV_KEY = 'aegir.events.v1';
  const nextDay = (dow, time) => { const n = nowParts(), mins = n.h * 60 + n.m, [h, m] = time.split(':').map(Number); let dd = (dow - n.dow + 7) % 7; if (dd === 0 && mins > h * 60 + m) dd = 7; return new Date(Date.UTC(n.y, n.mo - 1, n.d + dd)); };
  const evCard = (ev, withDoor) => { const d = ev.date, dn = A.doors[ev.door].name; return `<li class="ev" data-door="${ev.door}" style="--light:var(--${ev.door})"><time class="ev__d" datetime="${d.toISOString().slice(0, 10)}"><b>${d.getUTCDate()}</b><span>${t.months[d.getUTCMonth()]}</span></time><div class="ev__b"><h3></h3><p>${t.days[d.getUTCDay()]} ${ev.time}${withDoor ? ' ' + t.events.at + ' <span class="ev__door">' + dn + '</span>' : ''}</p></div>${ev.sample ? `<span class="tbc tbc--sample">${t.sample}</span>` : ''}</li>`; };
  const mkEv = (ev, withDoor) => { const tmp = document.createElement('div'); tmp.innerHTML = evCard(ev, withDoor); const li = tmp.firstElementChild; $('h3', li).textContent = ev.title; if (!ev.sample) li.dataset.real = '1'; return li; };
  const allEvents = () => {
    const mine = (store.get(EV_KEY, []) || []).map(e => { const [y, m, d] = e.date.split('-').map(Number); return { id: e.id, door: e.door, time: e.time, title: e.title, date: new Date(Date.UTC(y, m - 1, d)), sample: false }; });
    const samples = A.events.map(e => ({ id: e.id, door: e.door, time: e.time, title: e.title, date: nextDay(e.dow, e.time), sample: true }));
    const n = nowParts(), today = Date.UTC(n.y, n.mo - 1, n.d);
    return mine.filter(e => +e.date >= today).concat(samples).sort((a, b) => a.date - b.date || a.time.localeCompare(b.time));
  };
  window.AEGIR_UTIL.allEvents = allEvents; window.AEGIR_UTIL.EV_KEY = EV_KEY;
  const renderEvents = () => {
    const evs = allEvents();
    $$('[data-ev-home]').forEach(ul => { ul.innerHTML = ''; evs.slice(0, 3).forEach(e => { const li = mkEv(e, true); li.setAttribute('data-reveal', ''); li.classList.add('is-in'); ul.appendChild(li); }); });
    $$('[data-ev-door]').forEach(ul => { const d = ul.dataset.evDoor; ul.innerHTML = ''; evs.filter(e => e.door === d).slice(0, 4).forEach(e => { const li = mkEv(e, false); li.setAttribute('data-reveal', ''); li.classList.add('is-in'); ul.appendChild(li); }); });
    const page = $('[data-evpage]'); if (page) { page.innerHTML = ''; evs.forEach(e => { const li = mkEv(e, true); li.setAttribute('data-reveal', ''); li.classList.add('is-in'); page.appendChild(li); }); applyEvFilter(); }
  };
  let evFilter = 'all';
  const applyEvFilter = () => { const page = $('[data-evpage]'); if (!page) return; let n = 0; $$('.ev', page).forEach(li => { const show = evFilter === 'all' || li.dataset.door === evFilter; li.hidden = !show; if (show) n++; }); const em = $('[data-empty]'); if (em) em.hidden = n > 0; };
  renderEvents();
  $$('.fchip[data-door]').forEach(c => c.addEventListener('click', () => { evFilter = c.dataset.door; $$('.fchip[data-door]').forEach(x => x.setAttribute('aria-pressed', String(x === c))); applyEvFilter(); history.replaceState(null, '', evFilter === 'all' ? location.pathname + location.search : '#' + evFilter); }));
  { const hc = $$('.fchip[data-door]').find(x => x.dataset.door === location.hash.slice(1)); if (hc) hc.click(); }
  addEventListener('storage', (e) => { if (e.key === EV_KEY) renderEvents(); });

  /* images that finish loading after paint never move layout (width/height are on every img) */
})();
