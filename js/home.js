(() => {
  'use strict';

  /* ---------------- Menu: dropdowns and phone menu ---------------- */
  const menu = document.getElementById('menu');
  const burger = document.getElementById('burger');
  const drops = [...document.querySelectorAll('.has-drop')];

  function closeDrops(except) {
    drops.forEach((li) => {
      if (li === except) return;
      li.classList.remove('open');
      li.querySelector('.menu-top').setAttribute('aria-expanded', 'false');
    });
  }

  drops.forEach((li) => {
    const btn = li.querySelector('.menu-top');
    btn.addEventListener('click', () => {
      const open = !li.classList.contains('open');
      closeDrops(li);
      li.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  function closeMenu() {
    menu.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }

  burger.addEventListener('click', () => {
    const open = !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    if (!open) closeDrops();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.has-drop')) closeDrops();
    if (menu.classList.contains('open') && !e.target.closest('#menu, #burger')) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = drops.find((li) => li.classList.contains('open'));
    if (open) { closeDrops(); open.querySelector('.menu-top').focus(); }
    else if (menu.classList.contains('open')) { closeMenu(); burger.focus(); }
  });
  menu.querySelectorAll('.drop a').forEach((a) => a.addEventListener('click', () => { closeDrops(); closeMenu(); }));

  /* ---------------- Before / after slider ---------------- */
  const compare = document.getElementById('compare');
  const handle = document.getElementById('handle');
  let pos = 50;

  function setPos(p) {
    pos = Math.min(100, Math.max(0, p));
    compare.style.setProperty('--pos', `${pos}%`);
    const r = Math.round(pos);
    handle.setAttribute('aria-valuenow', String(r));
    handle.setAttribute('aria-valuetext', `${r}% before, ${100 - r}% after`);
  }

  function fromEvent(e) {
    // Measure inside the frame's border, where the photos sit.
    const rect = compare.getBoundingClientRect();
    setPos(((e.clientX - rect.left - compare.clientLeft) / compare.clientWidth) * 100);
  }

  let dragging = false;
  compare.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    compare.classList.add('dragging', 'touched');
    compare.setPointerCapture(e.pointerId);
    fromEvent(e);
  });
  compare.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
  const stop = () => { dragging = false; compare.classList.remove('dragging'); };
  compare.addEventListener('pointerup', stop);
  compare.addEventListener('pointercancel', stop);

  handle.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 2;
    const keys = { ArrowLeft: pos - step, ArrowDown: pos - step, ArrowRight: pos + step, ArrowUp: pos + step, Home: 0, End: 100, PageDown: pos - 10, PageUp: pos + 10 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    compare.classList.add('touched');
    setPos(keys[e.key]);
  });

  /* ---------------- Dialogs ---------------- */
  function openDialog(id, service) {
    const dlg = document.getElementById(id);
    if (!dlg) return;
    closeDrops();
    closeMenu();
    if (service) {
      const sel = dlg.querySelector('select[name="service"]');
      if (sel) sel.value = service;
    }
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  document.querySelectorAll('[data-open]').forEach((el) => {
    el.addEventListener('click', () => openDialog(el.dataset.open, el.dataset.service));
  });
  document.querySelectorAll('dialog').forEach((dlg) => {
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    // Click on the dimmed backdrop closes the dialog.
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  });
  if (location.hash === '#enquire') openDialog('enquire');

  /* ---------------- Forms (FormSubmit) ---------------- */
  const QUOTE_EMAIL = 'fiona.abac@gmail.com';
  const FORM_ENDPOINT = `https://formsubmit.co/ajax/${QUOTE_EMAIL}`;
  const PHONE_LINK = '<a href="tel:+353863654911">086 365 4911</a>';
  const LABELS = { name: 'Name', phone: 'Phone', email: 'Email', area: 'Area or Eircode', service: 'Interested in', best_time: 'Best time to call', message: 'Message' };
  const checks = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Enter your name.'),
    phone: (v) => (v.replace(/\D/g, '').length >= 7 ? '' : 'Enter a phone number we can call, with at least 7 digits.'),
    area: (v) => (v.trim().length >= 2 ? '' : 'Enter your area or Eircode.'),
    email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Check the email address, or leave it blank.'),
  };

  document.querySelectorAll('.lead-form').forEach((form) => {
    const kind = form.dataset.kind;
    const status = form.querySelector('.form-status');
    const errorsBox = form.querySelector('.form-errors');
    const submit = form.querySelector('[type="submit"]');
    const SUBMIT_LABEL = submit.textContent;
    const fields = Object.keys(checks).filter((n) => form.elements[n]);

    function setFieldError(input, msg) {
      const field = input.closest('.field');
      field.classList.toggle('has-err', !!msg);
      field.querySelector('.err').textContent = msg;
      if (msg) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }

    function validate() {
      const problems = [];
      fields.forEach((name) => {
        const input = form.elements[name];
        const msg = checks[name](input.value);
        setFieldError(input, msg);
        if (msg) problems.push({ input, msg });
      });
      if (!problems.length) { errorsBox.hidden = true; errorsBox.innerHTML = ''; return true; }
      errorsBox.innerHTML = `<p>Please fix ${problems.length === 1 ? 'this' : `these ${problems.length} things`} before sending:</p><ul></ul>`;
      const ul = errorsBox.querySelector('ul');
      problems.forEach(({ input, msg }) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${input.id}`;
        a.textContent = msg;
        a.addEventListener('click', (e) => { e.preventDefault(); input.focus(); });
        li.append(a);
        ul.append(li);
      });
      errorsBox.hidden = false;
      errorsBox.focus();
      return false;
    }

    form.addEventListener('input', (e) => {
      const fn = checks[e.target.name];
      const field = e.target.closest('.field');
      if (fn && field && field.classList.contains('has-err')) setFieldError(e.target, fn(e.target.value));
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
          <button type="button" class="btn copy">Copy details</button>
          <a class="btn copy" href="${mail}">Open email</a>
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
            _subject: `${kind} from ${data.name}${data.area ? ` (${data.area})` : ''}`,
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
        showStatus('ok', `<strong>Thanks, ${first}. Your ${kind.toLowerCase()} has been sent.</strong><span>We'll be in touch on the number you gave us. If it's urgent, call ${PHONE_LINK}.</span>`);
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
  });
})();
