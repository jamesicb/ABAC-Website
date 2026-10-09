(() => {
  'use strict';

  const card = document.getElementById('enquire');

  /* ---------------- Job photos: show the next one every 3 seconds ---------------- */
  const slides = [...document.querySelectorAll('.photo-img')];
  const dots = [...document.querySelectorAll('.photo-dot')];
  const pause = document.querySelector('.photo-pause');
  let current = 0;
  let timer = null;

  function show(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-on', n === current));
    dots.forEach((d, n) => d.setAttribute('aria-current', String(n === current)));
  }
  function play() {
    clearInterval(timer);
    timer = setInterval(() => {
      // Wait for the next photo to finish loading rather than fading to a blank box
      if (slides[(current + 1) % slides.length].complete) show(current + 1);
    }, 3000);
  }
  function paused() { return pause.getAttribute('aria-pressed') === 'true'; }

  pause.addEventListener('click', () => {
    const nowPaused = !paused();
    pause.setAttribute('aria-pressed', String(nowPaused));
    if (nowPaused) clearInterval(timer);
    else play();
  });
  dots.forEach((d, n) => d.addEventListener('click', () => {
    show(n);
    if (!paused()) play();
  }));
  play();

  /* ---------------- Service tiles fill in the service and jump to the form ---------------- */
  const form = document.getElementById('quote-form');
  const nameInput = document.getElementById('q-name');
  document.querySelectorAll('.svc[data-service]').forEach((tile) => {
    tile.addEventListener('click', (e) => {
      e.preventDefault();
      form.elements.service.value = tile.dataset.service;
      card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      nameInput.focus({ preventScroll: true });
    });
  });
  if (location.hash === '#enquire') nameInput.focus({ preventScroll: true });

  /* ---------------- Quote form (FormSubmit) ---------------- */
  const QUOTE_EMAIL = 'fiona.abac@gmail.com';
  const FORM_ENDPOINT = `https://formsubmit.co/ajax/${QUOTE_EMAIL}`;
  const PHONE_LINK = '<a href="tel:+353863654911">086 365 4911</a>';
  const LABELS = { name: 'Name', phone: 'Phone', email: 'Email', address: 'Address', service: 'Interested in' };
  const checks = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Enter your name.'),
    phone: (v) => (v.replace(/\D/g, '').length >= 7 ? '' : 'Enter a phone number with at least 7 digits.'),
    email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Check the email address, or leave it blank.'),
    address: (v) => (v.trim().length >= 4 ? '' : 'Enter your address so we can price your home.'),
  };

  const kind = form.dataset.kind;
  const status = form.querySelector('.form-status');
  const errs = document.getElementById('q-errs');
  const submit = form.querySelector('[type="submit"]');
  const SUBMIT_LABEL = submit.textContent;

  function setFieldError(input, msg) {
    input.closest('.field').classList.toggle('has-err', !!msg);
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function validate() {
    const problems = [];
    Object.entries(checks).forEach(([name, fn]) => {
      const input = form.elements[name];
      const msg = fn(input.value);
      setFieldError(input, msg);
      if (msg) problems.push({ input, msg });
    });
    errs.innerHTML = '';
    errs.hidden = !problems.length;
    problems.forEach(({ input, msg }) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${input.id}`;
      a.textContent = msg;
      a.addEventListener('click', (e) => { e.preventDefault(); input.focus(); });
      li.append(a);
      errs.append(li);
    });
    if (problems.length) problems[0].input.focus();
    return !problems.length;
  }

  // Once a field has been flagged, re-check it as the person types.
  form.addEventListener('input', (e) => {
    const fn = checks[e.target.name];
    if (fn && e.target.closest('.field').classList.contains('has-err')) setFieldError(e.target, fn(e.target.value));
  });

  const summary = (data) => Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${LABELS[k] || k}: ${v}`).join('\n');

  function showStatus(cls, html) {
    status.className = `form-status ${cls}`;
    status.innerHTML = html;
  }

  function showFallback(text) {
    const mail = `mailto:${QUOTE_EMAIL}?subject=${encodeURIComponent(kind)}&body=${encodeURIComponent(text)}`;
    showStatus('fail', `
      <strong>Your request didn't send. Your details are still in the form.</strong>
      <span>Please try again, call ${PHONE_LINK}, or email the details below to <a href="mailto:${QUOTE_EMAIL}">${QUOTE_EMAIL}</a>.</span>
      <pre></pre>
      <span style="display:flex;flex-wrap:wrap;gap:8px">
        <button type="button" class="copy">Copy details</button>
        <a class="copy" href="${mail}">Open email</a>
      </span>`);
    const pre = status.querySelector('pre');
    pre.textContent = text;
    status.querySelector('button.copy').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      try {
        await navigator.clipboard.writeText(`To: ${QUOTE_EMAIL}\n\n${text}`);
        btn.textContent = 'Copied';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        btn.textContent = 'Selected, press copy';
      }
    });
  }

  let sending = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending || form.elements._honey.value) return;
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
          _subject: `${kind} from ${data.name}`,
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
      showStatus('ok', `<strong>Thanks, ${first}. Your quote request has been sent.</strong><span>We'll be in touch on the number you gave us. If it's urgent, call ${PHONE_LINK}.</span>`);
    } catch {
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
