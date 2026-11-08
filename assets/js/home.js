/* ÆGIR Brugghús v4 home page behaviour (spec: _docs/aegir-brugghus-2026-11-06/MOTION.md).
   Vanilla. Scroll-linked values are pure functions of scroll position, so reversing retraces exactly. No GSAP, no Lenis:
   on fine pointers the scroll position is damped (exp, 90 ms) before it drives anything; phones and reduced motion read it raw / not at all. */
(() => {
  'use strict';
  const U = window.AEGIR_UTIL, A = window.AEGIR; if (!U || !A) return;
  const { $, $$, reduce } = U;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const setVar = (el, k, v) => { if (el._v === undefined) el._v = {}; if (el._v[k] !== v) { el._v[k] = v; el.style.setProperty(k, v); } };
  const docTop = (el) => { let y = 0; for (let e = el; e; e = e.offsetParent) y += e.offsetTop; return y; };
  const SEA = '#0B0B0A', CREAM = '#F7F5EF', INK = '#0B0B0A';
  const barH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 64;

  /* ---------- hero: one beer at a time. The strip picks the beer; ground, sunburst, text, header and can follow. ---------- */
  const hx = $('[data-hx]');
  const body = document.body;
  let past = false, cur = 0, ink = false, bar = null;
  const paintBar = () => { const b = bar || { g: hx ? hx.style.getPropertyValue('--g') : SEA, f: hx ? hx.style.getPropertyValue('--f') : CREAM }; body.style.setProperty('--bar-bg', past ? SEA : b.g); body.style.setProperty('--bar-fg', past ? CREAM : b.f); body.classList.toggle('is-ink', ink); };

  if (hx) {
    const HXD = JSON.parse($('[data-hx-data]', hx).textContent), N = HXD.length, D = hx.dataset;
    const nameEl = $('[data-hx-name]', hx), styleEl = $('[data-hx-style]', hx), whereEl = $('[data-hx-where]', hx), linkEl = $('[data-hx-link]', hx), canBox = $('.hx__canw', hx), pill = $('[data-hh-pill]', hx);
    const prevB = $('[data-hx-prev]', hx), nextB = $('[data-hx-next]', hx), nEl = $('[data-hx-n]', hx);
    let auto = !reduce.matches, timer = 0, token = 0, inView = true;

    /* same markup as the build-time chars(): word wrappers > per-character spans, plus a screen-reader copy */
    const nameNodes = (s) => {
      const cs = document.createElement('span'); cs.className = 'cs'; cs.setAttribute('aria-hidden', 'true'); let n = 0;
      s.split(' ').forEach((wd, wi) => { if (wi) cs.append(' '); const cw = document.createElement('span'); cw.className = 'cw'; [...wd].forEach(ch => { const c = document.createElement('span'); c.className = 'ch'; c.style.setProperty('--i', String(n++)); const i = document.createElement('span'); i.textContent = ch; c.append(i); cw.append(c); }); cs.append(cw); });
      const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = s; return [cs, sr];
    };
    const whereText = (slug) => { const on = (d) => U.tapsFor && U.tapsFor(d).some(x => x.s === slug && !x.k); const a = on('d101'), b = on('d220'); return a && b ? D.tBoth : a ? D.t101 : b ? D.t220 : D.tNone; };
    const refreshWhere = () => { whereEl.textContent = whereText(HXD[cur].slug); };

    const show = async (to) => {
      const i = (to + N) % N; if (i === cur) return;
      const d = HXD[i], id = ++token;
      /* decode the new can first so the swap never flashes an empty frame */
      const img = new Image(); img.alt = ''; img.width = 410; img.height = 760; img.sizes = '(min-width:760px) 410px, 56vw'; img.srcset = `${d.canS} 281w, ${d.can} 410w`; img.src = d.can;
      try { await img.decode(); } catch (e) { /* shown anyway */ }
      if (id !== token) return;
      cur = i;
      hx.style.setProperty('--g', d.g); hx.style.setProperty('--r', d.r); hx.style.setProperty('--f', d.f); hx.style.setProperty('--a', d.a);
      ink = d.f.toLowerCase() === INK.toLowerCase(); bar = { g: d.g, f: d.f }; paintBar();
      nameEl.style.setProperty('--cn', String(d.cn)); nameEl.replaceChildren(...nameNodes(d.name));
      styleEl.textContent = d.style; linkEl.href = d.href; refreshWhere();
      nEl.firstChild.textContent = String(i + 1).padStart(2, '0') + ' ';
      const old = canBox.querySelector('img:not(.is-out)');
      if (old) { old.classList.add('is-out'); if (reduce.matches) old.remove(); else { old.addEventListener('animationend', () => old.remove(), { once: true }); setTimeout(() => old.remove(), 900); } }
      img.setAttribute('data-hx-can', ''); img.classList.add('is-in'); canBox.append(img);
    };
    const stopAuto = () => { auto = false; clearTimeout(timer); };
    const schedule = () => { clearTimeout(timer); if (!auto) return; timer = setTimeout(() => { if (!document.hidden && inView && auto) show(cur + 1); schedule(); }, 7000); };

    prevB.addEventListener('click', () => { stopAuto(); show(cur - 1); });
    nextB.addEventListener('click', () => { stopAuto(); show(cur + 1); });
    hx.addEventListener('focusin', stopAuto);
    /* the live pill starts on a door that is open right now, else 101 */
    const doors = ['d101', 'brewery', 'd220'], openNow = doors.find(k => A.doors[k] && U.statusOf(A.doors[k]).state === 'open');
    if (pill) { pill.dataset.chip = openNow || 'd101'; if (U.paintChips) U.paintChips(true); }
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { threshold: .35 }).observe(hx);
    addEventListener('storage', refreshWhere);
    refreshWhere(); bar = { g: hx.style.getPropertyValue('--g'), f: hx.style.getPropertyValue('--f') }; paintBar(); schedule();
    /* preload the other cans once the page is idle, so the first switch is instant */
    (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(() => HXD.forEach(d => { const im = new Image(); im.srcset = `${d.canS} 281w, ${d.can} 410w`; im.sizes = '(min-width:760px) 410px, 56vw'; im.src = d.can; }));
  }

  /* ---------- char reveals (parent trigger, plays once) ---------- */
  const charEls = $$('[data-chars]');
  charEls.forEach(el => $$('.ch', el).forEach(c => c.style.setProperty('--rc', (Math.random() * 28 - 14).toFixed(1) + 'deg')));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: .3 });
    charEls.forEach(el => io.observe(el));
  } else charEls.forEach(el => el.classList.add('is-in'));

  /* ---------- scroll-linked engine ---------- */
  const words = $$('.ww__p .w'), wp = $('.ww__p'), pars = $$('[data-par]'), stamp = $('[data-stamp]');
  let vh = innerHeight, sy = scrollY, ssy = sy, last = 0, raf = 0;
  let geo = { par: [], stamp: null, wp: 0 };

  const measure = () => {
    vh = innerHeight;
    geo.par = pars.map(el => ({ el, top: docTop(el), h: el.offsetHeight, k: parseFloat(el.dataset.par) }));
    geo.stamp = stamp ? { top: docTop(stamp), h: stamp.offsetHeight } : null;
    if (wp) geo.wp = { top: docTop(wp), h: wp.offsetHeight };
  };

  const run = (p) => {
    /* header colours: the beer's own over the hero, sea below it (not damped: it must match what is under the bar) */
    if (hx) { const np = scrollY >= hx.offsetHeight - barH() - 2; if (np !== past) { past = np; body.classList.toggle('is-past', past); paintBar(); } }
    if (reduce.matches) return;
    /* hero scroll-out: the can drifts up and tilts, text and strip fade over the first 45% */
    if (hx) setVar(hx, '--hp', clamp(p / hx.offsetHeight).toFixed(4));
    /* paragraph fills in word by word: starts at top 78%, runs for ~one paragraph height */
    if (words.length && geo.wp) {
      const prog = clamp((p + vh * .78 - geo.wp.top) / Math.max(320, geo.wp.h * 1.1));
      if (words._p !== prog) { words._p = prog; const n = words.length; words.forEach((w, i) => { const o = (.12 + .88 * clamp(prog * n - i)).toFixed(3); if (w._o !== o) { w._o = o; w.style.opacity = o; } }); }
    }
    /* stamp card */
    if (geo.stamp) { const s0 = geo.stamp.top - vh, s1 = geo.stamp.top + geo.stamp.h / 2 - vh / 2, q = clamp((p - s0) / (s1 - s0)); setVar(stamp, 'scale', (.82 + .18 * q).toFixed(4)); stamp.style.rotate = (-4 * (1 - q)).toFixed(2) + 'deg'; }
    /* photos drift at different speeds */
    geo.par.forEach(g => { const q = clamp((p + vh - g.top) / (vh + g.h)); g.el.style.translate = `0 ${(q * g.k).toFixed(3)}%`; });
  };

  const tick = (now) => {
    raf = 0; const dt = Math.min(64, now - last || 16); last = now; sy = scrollY;
    ssy = fine.matches && !reduce.matches ? ssy + (sy - ssy) * (1 - Math.exp(-dt / 90)) : sy;
    if (Math.abs(sy - ssy) < .4) ssy = sy;
    run(ssy);
    if (ssy !== sy) raf = requestAnimationFrame(tick);
  };
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }

  /* can slider cards: the card moving in/out of the track tilts (rotate 6, scale .86 at the edge) and its can drifts (xPercent -6..6); hand-driven */
  const track = $('[data-track]');
  if (track) {
    const slides = $$('.slide', track);
    const tilt = () => {
      if (reduce.matches) { slides.forEach(s => { s.style.scale = ''; s.style.rotate = ''; const c = s.querySelector('.slide__can'); if (c) c.style.translate = ''; }); return; }
      const w = track.clientWidth || 1, x0 = track.scrollLeft;
      slides.forEach((s) => { const d = clamp((s.offsetLeft - track.offsetLeft - x0) / w, -1, 1), a = Math.abs(d); s.style.scale = (1 - a * .14).toFixed(4); s.style.rotate = (d * 6).toFixed(2) + 'deg'; const c = s.querySelector('.slide__can'); if (c) c.style.translate = (-d * 6).toFixed(2) + '%'; });
    };
    track.addEventListener('scroll', tilt, { passive: true }); addEventListener('resize', tilt); tilt();
  }

  const onReduce = () => {
    if (reduce.matches) {
      if (hx) { hx.style.removeProperty('--hp'); hx._v = undefined; }
      words.forEach(w => { w.style.opacity = ''; w._o = undefined; }); words._p = undefined;
      geo.par.forEach(g => { g.el.style.translate = ''; }); if (stamp) { stamp.style.scale = ''; stamp.style.rotate = ''; stamp._v = undefined; }
    }
    measure(); kick();
  };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { measure(); kick(); });
  addEventListener('load', () => { measure(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); kick(); });
  (reduce.addEventListener ? reduce.addEventListener.bind(reduce, 'change') : reduce.addListener.bind(reduce))(onReduce);
  measure(); kick();
})();
