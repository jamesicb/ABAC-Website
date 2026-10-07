(() => {
  'use strict';

  const FRAME_COUNT = 113;
  const FRAME_W = 1280;
  const FRAME_H = 720;
  const framePath = (i) => `assets/sequence/f${String(i + 1).padStart(3, '0')}.webp`;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Cinematic scroll ---------------- */
  const film = document.querySelector('.film');
  const canvas = document.getElementById('film-canvas');
  const poster = document.querySelector('.film-poster');
  const ctx = canvas.getContext('2d', { alpha: false });
  const bar = document.getElementById('film-progress');
  const beats = [...document.querySelectorAll('.beat')];
  const railItems = [...document.querySelectorAll('.film-rail li')];

  const frames = new Array(FRAME_COUNT);
  const loaded = new Uint8Array(FRAME_COUNT);
  let current = -1;
  let progress = 0;
  let needsDraw = true;

  // Load the first frame, then a coarse pass across the film, then fill in,
  // so any scroll position has a nearby frame early.
  function loadOrder() {
    const order = [];
    const seen = new Set();
    for (const step of [16, 8, 4, 2, 1]) {
      for (let i = 0; i < FRAME_COUNT; i += step) {
        if (!seen.has(i)) { seen.add(i); order.push(i); }
      }
    }
    if (!seen.has(FRAME_COUNT - 1)) order.splice(1, 0, FRAME_COUNT - 1);
    return order;
  }

  function startLoading() {
    const queue = loadOrder();
    let active = 0;
    const MAX = 6;
    const next = () => {
      while (active < MAX && queue.length) {
        const i = queue.shift();
        const img = new Image();
        img.decoding = 'async';
        active++;
        img.onload = () => {
          frames[i] = img; loaded[i] = 1; active--;
          if (i === 0 || Math.abs(i - targetIndex()) < 6) needsDraw = true;
          next();
        };
        img.onerror = () => { active--; next(); };
        img.src = framePath(i);
      }
    };
    next();
  }

  function nearestLoaded(i) {
    if (loaded[i]) return i;
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (i - d >= 0 && loaded[i - d]) return i - d;
      if (i + d < FRAME_COUNT && loaded[i + d]) return i + d;
    }
    return -1;
  }

  // Scroll progress to frame. The film is uneven (the wall changes quickly,
  // the pull-back is long), so each caption gets its own stretch of footage.
  const TIMELINE = [[0, 0], [0.16, 4], [0.36, 14], [0.56, 34], [0.78, 58], [1, FRAME_COUNT - 1]];
  function targetIndex() {
    for (let k = 1; k < TIMELINE.length; k++) {
      if (progress <= TIMELINE[k][0]) {
        const [p0, f0] = TIMELINE[k - 1], [p1, f1] = TIMELINE[k];
        return Math.round(f0 + (f1 - f0) * ((progress - p0) / (p1 - p0)));
      }
    }
    return FRAME_COUNT - 1;
  }

  let cw = 0, ch = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    cw = Math.round(r.width * dpr);
    ch = Math.round(r.height * dpr);
    canvas.width = cw; canvas.height = ch;
    needsDraw = true; current = -1;
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const ease = (t) => t * t * (3 - 2 * t);

  // Where to centre the crop across the film (fraction of frame width).
  // The close-up follows the new layers, then settles on the house with the
  // untouched house next door kept in view as the before.
  const FOCUS = [[0, 0.5], [0.36, 0.48], [0.56, 0.5], [0.7, 0.55], [0.85, 0.5], [1, 0.47]];
  function focusAt(p) {
    for (let k = 1; k < FOCUS.length; k++) {
      if (p <= FOCUS[k][0]) {
        const [p0, x0] = FOCUS[k - 1], [p1, x1] = FOCUS[k];
        return lerp(x0, x1, ease((p - p0) / (p1 - p0)));
      }
    }
    return FOCUS[FOCUS.length - 1][1];
  }

  function draw() {
    const idx = nearestLoaded(targetIndex());
    if (idx < 0) return;
    const img = frames[idx];
    const cover = Math.max(cw / FRAME_W, ch / FRAME_H);
    const portrait = ch > cw * 1.05;
    let scale = cover;
    let yCenter = ch / 2;
    if (portrait) {
      // On tall screens the close-up fills the screen, then the camera
      // pulls back so both houses are in view across the width at the end.
      const houseFit = (cw / FRAME_W) * 1.2;
      const t = ease(clamp01((progress - 0.62) / 0.3));
      scale = lerp(cover, Math.max(houseFit, cw / FRAME_W), t);
      yCenter = lerp(ch / 2, ch * 0.4, t);
    }
    const dw = FRAME_W * scale, dh = FRAME_H * scale;
    let dx = cw / 2 - focusAt(progress) * dw;
    dx = Math.min(0, Math.max(cw - dw, dx));
    let dy = yCenter - dh / 2;
    if (dh >= ch) dy = Math.min(0, Math.max(ch - dh, dy));

    ctx.fillStyle = '#1d2124';
    ctx.fillRect(0, 0, cw, ch);
    if (dh < ch) {
      // Fill the bands above and below with a dimmed, enlarged copy of the frame.
      const bs = ch / FRAME_H;
      const bw = FRAME_W * bs;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(img, cw / 2 - focusAt(progress) * bw, 0, bw, ch);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(29,33,36,0.55)';
      ctx.fillRect(0, 0, cw, ch);
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    if (dh < ch) {
      const fade = Math.min(80 * dpr, dh * 0.2);
      let g = ctx.createLinearGradient(0, dy, 0, dy + fade);
      g.addColorStop(0, 'rgba(29,33,36,1)'); g.addColorStop(1, 'rgba(29,33,36,0)');
      ctx.fillStyle = g; ctx.fillRect(0, dy - 1, cw, fade + 1);
      g = ctx.createLinearGradient(0, dy + dh - fade, 0, dy + dh);
      g.addColorStop(0, 'rgba(29,33,36,0)'); g.addColorStop(1, 'rgba(29,33,36,1)');
      ctx.fillStyle = g; ctx.fillRect(0, dy + dh - fade, cw, fade + 1);
    }
    current = idx;
    if (poster && !poster.hidden) poster.hidden = true;
  }

  let activeBeat = 0;
  function updateBeats() {
    let on = -1;
    beats.forEach((b, i) => {
      if (progress >= +b.dataset.from && progress < +b.dataset.to) on = i;
    });
    if (on !== activeBeat) {
      beats.forEach((b, i) => b.classList.toggle('is-on', i === on));
      activeBeat = on;
    }
    const railOn = on >= 0 ? on : beats.reduce((acc, b, i) => (progress >= +b.dataset.from ? i : acc), 0);
    railItems.forEach((li, i) => li.classList.toggle('is-on', i === railOn));
  }

  function readScroll() {
    const r = film.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    progress = total > 0 ? clamp01(-r.top / total) : 0;
    film.classList.toggle('is-moving', progress > 0.02);
    bar.style.width = (progress * 100).toFixed(2) + '%';
    updateBeats();
    if (targetIndex() !== current) needsDraw = true;
  }

  function tick() {
    if (needsDraw) { needsDraw = false; draw(); }
    requestAnimationFrame(tick);
  }

  if (film && canvas) {
    resize();
    readScroll();
    startLoading();
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('resize', () => { resize(); readScroll(); });
    requestAnimationFrame(tick);
  }

  /* ---------------- Nav ---------------- */
  const nav = document.getElementById('nav');
  const menuBtn = document.getElementById('menu-btn');
  const quick = document.getElementById('quick');
  const quoteSection = document.getElementById('quote');

  function onScrollNav() {
    const pastFilm = film ? film.getBoundingClientRect().bottom <= nav.offsetHeight + 1 : window.scrollY > 40;
    nav.classList.toggle('is-solid', pastFilm);
    const q = quoteSection.getBoundingClientRect();
    const inQuote = q.top < window.innerHeight * 0.85 && q.bottom > 0;
    quick.classList.toggle('is-on', pastFilm && !inQuote);
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  function closeMenu() {
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
  }
  menuBtn.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  document.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // Anchor links: offset for the fixed nav, and respect reduced motion.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const el = id === 'top' ? document.body : document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const y = id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - (id === 'quote' ? 0 : nav.offsetHeight - 1);
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
      if (id === 'quote') setTimeout(() => document.getElementById('q-name').focus({ preventScroll: true }), reduceMotion ? 0 : 700);
    });
  });

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------------- Quote form ---------------- */
  const QUOTE_EMAIL = 'fiona.abac@gmail.com';
  const FORM_ENDPOINT = `https://formsubmit.co/ajax/${QUOTE_EMAIL}`;
  const form = document.getElementById('quote-form');
  const status = document.getElementById('form-status');
  const submit = document.getElementById('q-submit');

  const checks = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
    phone: (v) => (v.replace(/[^\d]/g, '').length >= 7 ? '' : 'Please enter a phone number we can call.'),
    email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please check your email address, or leave it blank.'),
    area: (v) => (v.trim().length >= 2 ? '' : 'Please tell us where the house is.'),
  };

  function validate() {
    let first = null;
    for (const [name, fn] of Object.entries(checks)) {
      const input = form.elements[name];
      const msg = fn(input.value);
      const field = input.closest('.field');
      field.classList.toggle('has-err', !!msg);
      field.querySelector('.err').textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg && !first) first = input;
    }
    if (first) first.focus();
    return !first;
  }
  form.addEventListener('input', (e) => {
    const fn = checks[e.target.name];
    const field = e.target.closest('.field');
    if (fn && field.classList.contains('has-err')) {
      const msg = fn(e.target.value);
      field.classList.toggle('has-err', !!msg);
      field.querySelector('.err').textContent = msg;
    }
  });

  function summary(data) {
    return [
      `Name: ${data.name}`,
      `Phone: ${data.phone}`,
      data.email ? `Email: ${data.email}` : null,
      `Area or Eircode: ${data.area}`,
      data.house_type ? `Type of house: ${data.house_type}` : null,
      data.message ? `Message: ${data.message}` : null,
    ].filter(Boolean).join('\n');
  }

  function showStatus(kind, html) {
    status.className = `form-status ${kind}`;
    status.innerHTML = html;
    status.hidden = false;
  }

  function showFallback(text) {
    const mail = `mailto:${QUOTE_EMAIL}?subject=${encodeURIComponent('Quote request')}&body=${encodeURIComponent(text)}`;
    showStatus('fail', `
      <strong>Your request didn't send.</strong>
      <span>Please call 086 365 4911, or email the details below to ${QUOTE_EMAIL}.</span>
      <pre id="fallback-text"></pre>
      <span style="display:flex;flex-wrap:wrap;gap:8px">
        <button type="button" class="btn btn-dark copy" id="copy-btn">Copy details</button>
        <a class="btn btn-dark copy" href="${mail}">Open email</a>
      </span>`);
    status.querySelector('#fallback-text').textContent = text;
    status.querySelector('#copy-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      try {
        await navigator.clipboard.writeText(`To: ${QUOTE_EMAIL}\n\n${text}`);
        btn.textContent = 'Copied';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(status.querySelector('#fallback-text'));
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        btn.textContent = 'Selected, press copy';
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.elements._honey.value) return;
    if (!validate()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    delete data._honey;
    const text = summary(data);

    submit.disabled = true;
    submit.textContent = 'Sending…';
    status.hidden = true;
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ...data,
          _subject: `Quote request from ${data.name} (${data.area})`,
          _template: 'table',
          _captcha: 'false',
          ...(data.email ? { _replyto: data.email } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || String(body.success) !== 'true') throw new Error(body.message || `HTTP ${res.status}`);
      form.reset();
      showStatus('ok', `<strong>Thanks, ${data.name.split(' ')[0].replace(/[<>&]/g, '')}. Your quote request has been sent.</strong><span>We'll be in touch on the number you gave us. If it's urgent, call 086 365 4911.</span>`);
    } catch (err) {
      showFallback(text);
    } finally {
      submit.disabled = false;
      submit.textContent = 'Send quote request';
    }
  });
})();
