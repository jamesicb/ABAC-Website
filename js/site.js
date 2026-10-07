(() => {
  'use strict';

  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const nav = document.getElementById('nav');
  const navH = () => nav.offsetHeight;

  /* ---------------- Opening film ---------------- */
  const FRAME_COUNT = 113;
  const FRAME_W = 1280;
  const FRAME_H = 720;
  const framePath = (i) => `assets/sequence/f${String(i + 1).padStart(3, '0')}.webp`;

  // Five stages. Each one holds on a short stretch of footage while its copy
  // is on screen, and the gaps between them carry the change. `at` is where
  // the stage buttons land.
  const STAGES = [
    { from: 0, to: 0.10, at: 0 },        // Start
    { from: 0.12, to: 0.25, at: 0.185 }, // Before
    { from: 0.29, to: 0.47, at: 0.38 },  // Insulation
    { from: 0.52, to: 0.68, at: 0.60 },  // Finish
    { from: 0.84, to: 1.01, at: 0.96 },  // Completed
  ];
  // Scroll progress to frame index.
  const TIMELINE = [[0, 0], [0.10, 0], [0.25, 3], [0.29, 10], [0.47, 30], [0.52, 40], [0.68, 56], [0.84, 98], [1, FRAME_COUNT - 1]];
  // Horizontal centre of the crop (fraction of frame width), for narrow screens.
  const FOCUS = [[0, 0.5], [0.29, 0.5], [0.47, 0.48], [0.52, 0.5], [0.62, 0.55], [0.84, 0.5], [1, 0.47]];

  const film = document.querySelector('.film');
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const ease = (t) => t * t * (3 - 2 * t);
  const along = (table, p, smooth) => {
    for (let k = 1; k < table.length; k++) {
      if (p <= table[k][0]) {
        const [p0, v0] = table[k - 1], [p1, v1] = table[k];
        const t = p1 > p0 ? (p - p0) / (p1 - p0) : 1;
        return lerp(v0, v1, smooth ? ease(t) : t);
      }
    }
    return table[table.length - 1][1];
  };

  let progress = 0;
  let filmTotal = 0;
  let filmTop = 0;

  function measureFilm() {
    if (!film) return;
    filmTop = film.getBoundingClientRect().top + window.scrollY;
    filmTotal = film.offsetHeight - window.innerHeight;
  }

  if (motion && film) {
    const canvas = document.getElementById('film-canvas');
    const poster = film.querySelector('.film-poster');
    const ctx = canvas.getContext('2d', { alpha: false });
    const bar = document.getElementById('film-progress');
    const beats = [...film.querySelectorAll('.beat')];
    const railButtons = [...film.querySelectorAll('.film-rail button')];
    const narrow = window.matchMedia('(max-width: 960px)').matches;

    const frames = new Array(FRAME_COUNT);
    const loaded = new Uint8Array(FRAME_COUNT);
    let current = -1;
    let needsDraw = true;

    const targetIndex = () => Math.round(along(TIMELINE, progress, false));

    // First frame, then a coarse pass over the whole film, then fill in, so
    // any scroll position has a nearby frame early. Phones load every second
    // frame, which halves the download without visible steps.
    function loadOrder() {
      const order = [0, FRAME_COUNT - 1];
      const seen = new Set(order);
      const finest = narrow ? 2 : 1;
      for (const step of [16, 8, 4, 2, 1]) {
        if (step < finest) break;
        for (let i = 0; i < FRAME_COUNT; i += step) {
          if (!seen.has(i)) { seen.add(i); order.push(i); }
        }
      }
      return order;
    }

    function startLoading() {
      const queue = loadOrder();
      let active = 0;
      const next = () => {
        while (active < 6 && queue.length) {
          const i = queue.shift();
          const img = new Image();
          img.decoding = 'async';
          active++;
          img.onload = () => {
            frames[i] = img; loaded[i] = 1; active--;
            if (current < 0 || Math.abs(i - targetIndex()) < Math.abs(current - targetIndex())) needsDraw = true;
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

    let cw = 0, ch = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      cw = Math.round(r.width * dpr);
      ch = Math.round(r.height * dpr);
      canvas.width = cw; canvas.height = ch;
      needsDraw = true; current = -1;
    }

    function draw() {
      const idx = nearestLoaded(targetIndex());
      if (idx < 0) return;
      const img = frames[idx];
      const cover = Math.max(cw / FRAME_W, ch / FRAME_H);
      let scale = cover;
      let yCenter = ch / 2;
      if (ch > cw * 1.05) {
        // Tall screens: the close-up fills the screen, then the camera pulls
        // back so the whole house fits across the width, above the copy.
        const t = ease(clamp01((progress - 0.66) / 0.24));
        scale = lerp(cover, (cw / FRAME_W) * 1.2, t);
        yCenter = lerp(ch / 2, ch * 0.4, t);
      }
      const dw = FRAME_W * scale, dh = FRAME_H * scale;
      const focus = along(FOCUS, progress, true);
      let dx = Math.min(0, Math.max(cw - dw, cw / 2 - focus * dw));
      let dy = yCenter - dh / 2;
      if (dh >= ch) dy = Math.min(0, Math.max(ch - dh, dy));

      ctx.fillStyle = '#252b29';
      ctx.fillRect(0, 0, cw, ch);
      if (dh < ch) {
        // Fill the bands above and below with a dimmed copy of the frame.
        const bw = FRAME_W * (ch / FRAME_H);
        ctx.globalAlpha = 0.35;
        ctx.drawImage(img, cw / 2 - focus * bw, 0, bw, ch);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(37,43,41,0.6)';
        ctx.fillRect(0, 0, cw, ch);
      }
      ctx.drawImage(img, dx, dy, dw, dh);
      if (dh < ch) {
        const fade = Math.min(80 * dpr, dh * 0.2);
        let g = ctx.createLinearGradient(0, dy, 0, dy + fade);
        g.addColorStop(0, 'rgba(37,43,41,1)'); g.addColorStop(1, 'rgba(37,43,41,0)');
        ctx.fillStyle = g; ctx.fillRect(0, dy - 1, cw, fade + 1);
        g = ctx.createLinearGradient(0, dy + dh - fade, 0, dy + dh);
        g.addColorStop(0, 'rgba(37,43,41,0)'); g.addColorStop(1, 'rgba(37,43,41,1)');
        ctx.fillStyle = g; ctx.fillRect(0, dy + dh - fade, cw, fade + 1);
      }
      current = idx;
      if (!poster.hidden) poster.hidden = true;
    }

    let shownBeat = 0;
    let shownRail = 0;
    function updateStages() {
      const on = STAGES.findIndex((s) => progress >= s.from && progress < s.to);
      if (on !== shownBeat) {
        beats.forEach((b, i) => b.classList.toggle('is-on', i === on));
        shownBeat = on;
      }
      // Between stages the rail keeps the last stage reached.
      const rail = on >= 0 ? on : STAGES.reduce((acc, s, i) => (progress >= s.from ? i : acc), 0);
      if (rail !== shownRail) {
        railButtons.forEach((b, i) => {
          if (i === rail) b.setAttribute('aria-current', 'step');
          else b.removeAttribute('aria-current');
        });
        shownRail = rail;
      }
    }

    function readScroll() {
      progress = filmTotal > 0 ? clamp01((window.scrollY - filmTop) / filmTotal) : 0;
      film.classList.toggle('is-moving', progress > 0.02);
      bar.style.width = (progress * 100).toFixed(2) + '%';
      updateStages();
      if (targetIndex() !== current) needsDraw = true;
    }

    function tick() {
      if (needsDraw) { needsDraw = false; draw(); }
      requestAnimationFrame(tick);
    }

    // Stage buttons: go straight to the stage. Short hops glide, long ones jump.
    railButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        measureFilm();
        const y = Math.round(filmTop + STAGES[+btn.dataset.go].at * filmTotal);
        scrollToY(y);
      });
    });

    measureFilm();
    resize();
    readScroll();
    startLoading();
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('resize', () => { measureFilm(); resize(); readScroll(); });
    requestAnimationFrame(tick);
  }

  /* ---------------- Scrolling to places ---------------- */
  function scrollToY(y) {
    const far = Math.abs(y - window.scrollY) > window.innerHeight * 2.5;
    window.scrollTo({ top: y, behavior: far || !motion ? 'auto' : 'smooth' });
  }

  // Land section headings just below the fixed header.
  function anchorY(el) {
    const heading = el.matches('section') ? el.querySelector('h2') : null;
    const target = heading || el;
    const gap = heading ? 28 : 0;
    return Math.max(0, target.getBoundingClientRect().top + window.scrollY - navH() - gap);
  }

  const finePointer = window.matchMedia('(pointer: fine)').matches;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const el = id === 'top' ? null : document.getElementById(id);
    if (id !== 'top' && !el) return;
    e.preventDefault();
    closeMenu(false);
    scrollToY(id === 'top' ? 0 : anchorY(el));
    history.replaceState(null, '', id === 'top' ? location.pathname + location.search : `#${id}`);

    // Move keyboard focus to where the reader landed.
    let focusEl = el;
    if (id === 'top') focusEl = document.querySelector('.motion .film h1, .still .opening h1, .opening h1');
    else if (id === 'quote') focusEl = finePointer ? document.getElementById('q-name') : document.getElementById('form-title');
    else if (el.matches('section')) focusEl = el.querySelector('h2') || el;
    if (focusEl) {
      if (!focusEl.matches('a, button, input, select, textarea, [tabindex]')) focusEl.setAttribute('tabindex', '-1');
      focusEl.focus({ preventScroll: true });
    }
  });

  /* ---------------- Header ---------------- */
  const menuBtn = document.getElementById('menu-btn');
  const menu = document.getElementById('nav-menu');
  const quick = document.getElementById('quick');
  const quoteSection = document.getElementById('quote');
  const opening = motion ? film : document.querySelector('.opening');

  function onScrollNav() {
    // Dark gradient over the photograph; the solid ivory header takes over
    // as soon as the opening starts to leave the screen, so page content
    // never slides under a see-through header.
    let past = window.scrollY > 40;
    if (opening) {
      const b = opening.getBoundingClientRect().bottom;
      past = motion ? b < window.innerHeight - 1 : b <= navH() + 1;
    }
    nav.classList.toggle('is-solid', past);
    if (quick && quoteSection) {
      const q = quoteSection.getBoundingClientRect();
      const inQuote = q.top < window.innerHeight * 0.85 && q.bottom > 0;
      quick.classList.toggle('is-on', past && !inQuote && !nav.classList.contains('is-open'));
    }
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  window.addEventListener('resize', onScrollNav);
  onScrollNav();

  function closeMenu(returnFocus) {
    if (!nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuBtn.focus();
    onScrollNav();
  }
  function openMenu() {
    nav.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    const first = menu.querySelector('a');
    if (first) first.focus();
    onScrollNav();
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => (nav.classList.contains('is-open') ? closeMenu(false) : openMenu()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(true); });
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) closeMenu(false); });
    window.matchMedia('(min-width: 961px)').addEventListener('change', (m) => { if (m.matches) closeMenu(false); });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------------- Quote form ---------------- */
  const form = document.getElementById('quote-form');
  if (!form) return;
  const QUOTE_EMAIL = 'fiona.abac@gmail.com';
  const FORM_ENDPOINT = `https://formsubmit.co/ajax/${QUOTE_EMAIL}`;
  const status = document.getElementById('form-status');
  const errorsBox = document.getElementById('form-errors');
  const submit = document.getElementById('q-submit');
  const SUBMIT_LABEL = submit.textContent;

  const checks = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Enter your name.'),
    phone: (v) => (v.replace(/\D/g, '').length >= 7 ? '' : 'Enter a phone number we can call, with at least 7 digits.'),
    area: (v) => (v.trim().length >= 2 ? '' : 'Enter your area or Eircode.'),
    email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Check the email address, or leave it blank.'),
  };

  function setFieldError(input, msg) {
    const field = input.closest('.field');
    field.classList.toggle('has-err', !!msg);
    field.querySelector('.err').textContent = msg;
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function validate() {
    const problems = [];
    for (const [name, fn] of Object.entries(checks)) {
      const input = form.elements[name];
      const msg = fn(input.value);
      setFieldError(input, msg);
      if (msg) problems.push({ input, msg });
    }
    if (!problems.length) {
      errorsBox.hidden = true;
      errorsBox.innerHTML = '';
      return true;
    }
    errorsBox.innerHTML = `<p>Please fix ${problems.length === 1 ? 'this' : `these ${problems.length} things`} before sending:</p><ul></ul>`;
    const ul = errorsBox.querySelector('ul');
    problems.forEach(({ input, msg }) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${input.id}`;
      a.textContent = msg;
      a.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); input.focus(); });
      li.append(a);
      ul.append(li);
    });
    errorsBox.hidden = false;
    errorsBox.focus();
    return false;
  }

  // Once a field has been flagged, re-check it as the person types.
  form.addEventListener('input', (e) => {
    const fn = checks[e.target.name];
    if (fn && e.target.closest('.field').classList.contains('has-err')) setFieldError(e.target, fn(e.target.value));
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
  }

  function showFallback(text) {
    const mail = `mailto:${QUOTE_EMAIL}?subject=${encodeURIComponent('Quote request')}&body=${encodeURIComponent(text)}`;
    showStatus('fail', `
      <strong>Your request didn't send. Your details are still in the form.</strong>
      <span>Please try again, call <a href="tel:+353863654911">086 365 4911</a>, or email the details below to <a href="mailto:${QUOTE_EMAIL}">${QUOTE_EMAIL}</a>.</span>
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

  let sending = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    if (form.elements._honey.value) return;
    if (!validate()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    delete data._honey;
    const text = summary(data);

    sending = true;
    form.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    submit.textContent = 'Sending…';
    showStatus('', '');
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 20000);
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
        signal: abort.signal,
      });
      const body = await res.json().catch(() => ({}));
      // Only call it sent when FormSubmit says it accepted the request.
      if (!res.ok || String(body.success) !== 'true') throw new Error(body.message || `HTTP ${res.status}`);
      form.reset();
      const first = data.name.trim().split(/\s+/)[0].replace(/[<>&"']/g, '');
      showStatus('ok', `<strong>Thanks, ${first}. Your quote request has been sent.</strong><span>We'll be in touch on the number you gave us. If it's urgent, call <a href="tel:+353863654911">086 365 4911</a>.</span>`);
    } catch (err) {
      showFallback(text);
    } finally {
      clearTimeout(timer);
      sending = false;
      form.removeAttribute('aria-busy');
      submit.disabled = false;
      submit.textContent = SUBMIT_LABEL;
    }
  });
})();
