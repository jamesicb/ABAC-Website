(() => {
  'use strict';

  /* ---------------- Job photos: show the next one every 3 seconds ---------------- */
  const slides = [...document.querySelectorAll('.photo-img')];
  const dots = [...document.querySelectorAll('.photo-dot')];
  const pause = document.querySelector('.photo-pause');
  let current = 0;
  let timer = null;

  // Photos after the first only download when they're next up, to keep the page light
  function load(img) {
    if (!img.dataset.src) return;
    img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    delete img.dataset.src;
  }
  function ready(img) { return !img.dataset.src && img.complete && img.naturalWidth > 0; }

  // The card's tiles show the figures for the house in the photo (data-ber etc. on each photo)
  const heroTiles = document.querySelector('.hero-tiles');
  const heroVals = [...heroTiles.querySelectorAll('.ht-val')];
  let swapTimer = null;
  function showFigures(img) {
    const fill = () => heroVals.forEach((el) => {
      const v = img.dataset[el.dataset.key] || '';
      el.textContent = v;
      el.hidden = !v;
    });
    clearTimeout(swapTimer);
    // Fade the old figures out first, unless there are none showing
    if (heroVals.every((el) => el.hidden)) { fill(); return; }
    heroTiles.classList.add('is-swapping');
    swapTimer = setTimeout(() => { fill(); heroTiles.classList.remove('is-swapping'); }, 300);
  }

  function show(i) {
    current = (i + slides.length) % slides.length;
    showFigures(slides[current]);
    load(slides[current]);
    slides.forEach((s, n) => s.classList.toggle('is-on', n === current));
    dots.forEach((d, n) => d.setAttribute('aria-current', String(n === current)));
    load(slides[(current + 1) % slides.length]);
  }
  function play() {
    clearInterval(timer);
    timer = setInterval(() => {
      // Wait for the next photo to finish loading rather than fading to a blank box
      const next = slides[(current + 1) % slides.length];
      load(next);
      if (ready(next)) show(current + 1);
    }, 3000);
  }
  if (document.readyState === 'complete') load(slides[1]);
  else addEventListener('load', () => load(slides[1]));
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
  showFigures(slides[0]);
  play();

  /* ---------------- Benefit tiles open their details; "Get a free quote" jumps to the form ---------------- */
  // The quote form sits beside the FAQs (id "enquire")
  const quoteBox = document.getElementById('enquire');
  const nameInput = document.getElementById('q2-name');
  function goToForm() {
    quoteBox.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    nameInput.focus({ preventScroll: true });
  }
  document.querySelectorAll('.svc[aria-controls]').forEach((tile) => {
    const dlg = document.getElementById(tile.getAttribute('aria-controls'));
    tile.addEventListener('click', () => dlg.showModal());
    // A click on the dimmed backdrop (outside the box) closes it
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.querySelector('.more-cta').addEventListener('click', (e) => {
      e.preventDefault();
      dlg.close();
      goToForm();
    });
  });
  if (location.hash === '#enquire') nameInput.focus({ preventScroll: true });

  /* ---------------- Testimonial cards rise into place when scrolled to ---------------- */
  const reviews = document.querySelector('.reviews');
  if (reviews && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reviews.classList.add('will-rise');
    // Watch the list items, not the moving cards, so the start offset doesn't delay the trigger
    const rise = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-up');
        reviews.classList.add('is-up');
        rise.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    reviews.querySelectorAll('.rev-list > li').forEach((li) => rise.observe(li));
  }

  /* ---------------- FAQs: leave room for the longest answer ---------------- */
  // Beside the form, the FAQs panel is kept tall enough for its longest answer,
  // so opening one doesn't make either panel grow. Stacked (tablets, phones) it grows as normal.
  const faq = document.querySelector('.faq');
  const sideBySide = matchMedia('(min-width: 1024px)');
  function fitFaq() {
    faq.style.minHeight = '';
    if (!sideBySide.matches) return;
    // An invisible copy at the same width, opened one answer at a time
    const copy = faq.cloneNode(true);
    copy.classList.add('faq-measure');
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    const items = [...copy.querySelectorAll('details')];
    items.forEach((d) => d.removeAttribute('name'));
    copy.style.width = `${faq.getBoundingClientRect().width}px`;
    faq.after(copy);
    let tallest = 0;
    items.forEach((d) => {
      items.forEach((o) => { o.open = o === d; });
      tallest = Math.max(tallest, copy.getBoundingClientRect().height);
    });
    copy.remove();
    faq.style.minHeight = `${Math.ceil(tallest)}px`;
  }
  if (faq) {
    let queued = false;
    const refit = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; fitFaq(); });
    };
    fitFaq();
    // Text wrapping changes once the web fonts arrive and when the window is resized
    if (document.fonts) document.fonts.ready.then(refit);
    addEventListener('resize', refit);
  }

  /* ---------------- Quote form (FormSubmit) ---------------- */
  const QUOTE_EMAIL = 'fiona.abac@gmail.com';
  const FORM_ENDPOINT = `https://formsubmit.co/ajax/${QUOTE_EMAIL}`;
  const LABELS = { name: 'Name', phone: 'Phone', email: 'Email', address: 'Address', service: 'Interested in' };
  const checks = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Enter your name.'),
    phone: (v) => (v.replace(/\D/g, '').length >= 7 ? '' : 'Enter a phone number with at least 7 digits.'),
    email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Check the email address, or leave it blank.'),
    address: (v) => (v.trim().length >= 4 ? '' : 'Enter your address so we can price your home.'),
  };

  const summary = (data) => Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${LABELS[k] || k}: ${v}`).join('\n');

  // The result shows in a pop-up, so the form itself never grows
  const sentOk = document.getElementById('sent-ok');
  const sentFail = document.getElementById('sent-fail');
  const failDetails = sentFail.querySelector('.sent-details');
  const failMail = sentFail.querySelector('a.copy');
  const copyBtn = sentFail.querySelector('button.copy');
  [sentOk, sentFail].forEach((dlg) => dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }));

  function showFallback(kind, text) {
    failDetails.textContent = text;
    failMail.href = `mailto:${QUOTE_EMAIL}?subject=${encodeURIComponent(kind)}&body=${encodeURIComponent(text)}`;
    copyBtn.textContent = 'Copy details';
    sentFail.showModal();
  }
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(`To: ${QUOTE_EMAIL}\n\n${failDetails.textContent}`);
      copyBtn.textContent = 'Copied';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(failDetails);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      copyBtn.textContent = 'Selected, press copy';
    }
  });

  // Every quote form on the page works the same way (there's one now, beside the FAQs)
  function setupQuoteForm(form) {
    const kind = form.dataset.kind;
    const errs = form.querySelector('.errs');
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
        sentOk.showModal();
      } catch {
        showFallback(kind, text);
      } finally {
        clearTimeout(timer);
        sending = false;
        form.removeAttribute('aria-busy');
        submit.disabled = false;
        submit.textContent = SUBMIT_LABEL;
      }
    });
  }
  document.querySelectorAll('.lead-form').forEach(setupQuoteForm);
})();
