'use strict';

/* =====================================================================
   Page-turn navigation — progressive enhancement
   ===================================================================== */

(function initPageTurn() {
  const root = document.documentElement;
  const stage = document.getElementById('page-stage');
  if (!stage) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canEngage = window.matchMedia('(min-width: 1024px) and (pointer: fine)');

  const pages = Array.from(
    stage.querySelectorAll(':scope > main > section, :scope > #contact')
  );
  if (pages.length < 2) return;

  const pager = document.getElementById('page-pager');
  const hint = document.getElementById('page-hint');
  const countEl = document.querySelector('.pageturn-count');
  const intro = document.getElementById('pageturn-intro');
  const INTRO_SEEN_KEY = 'pageturn-intro-seen';

  const SECTION_LABELS = {
    hero: 'Intro',
    about: 'About',
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects',
    summary: 'Summary',
    contact: 'Contact',
  };

  let engaged = false;
  let index = 0;
  let animating = false;
  let wheelCooldown = 0;
  let hintTimer = null;

  function buildPager() {
    if (!pager || pager.childElementCount) return;
    pages.forEach((page, i) => {
      const id = page.id || `page-${i + 1}`;
      const label = SECTION_LABELS[page.id] || `Page ${i + 1}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pager-dot';
      btn.dataset.index = String(i);
      btn.setAttribute('aria-label', `Go to ${label}`);
      btn.innerHTML =
        `<span class="pager-label">${String(i + 1).padStart(2, '0')} · ${label}</span>` +
        `<span class="pager-tick" aria-hidden="true"></span>`;
      btn.addEventListener('click', () => goTo(i));
      pager.appendChild(btn);
    });
  }

  function syncPager() {
    if (!pager) return;
    Array.from(pager.children).forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle('is-active', active);
      if (active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  function showHintBriefly() {
    if (!hint) return;
    hint.classList.remove('is-hidden');
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => hint.classList.add('is-hidden'), 4200);
  }

  let introWired = false;
  function wireIntroOnce() {
    if (introWired || !intro) return;
    introWired = true;
    const dismiss = () => {
      intro.classList.remove('is-visible');
      window.setTimeout(() => { intro.hidden = true; }, 350);
      try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch (_) {}
    };
    const closeBtn = document.getElementById('pageturn-intro-close');
    const okBtn = document.getElementById('pageturn-intro-ok');
    if (closeBtn) closeBtn.addEventListener('click', dismiss);
    if (okBtn) okBtn.addEventListener('click', dismiss);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !intro.hidden) dismiss();
    });
  }

  function showIntroOnce() {
    if (!intro) return;
    let seen = false;
    try { seen = localStorage.getItem(INTRO_SEEN_KEY) === '1'; } catch (_) {}
    if (seen) return;
    wireIntroOnce();
    intro.hidden = false;
    window.requestAnimationFrame(() => intro.classList.add('is-visible'));
  }

  function applyStaticState() {
    pages.forEach((page, i) => {
      page.classList.add('pageturn-page');
      page.classList.toggle('is-current', i === index);
      page.classList.toggle('is-next', i > index);
      page.classList.toggle('is-prev', i < index);
    });
    syncPager();
  }

  function setPageNumber(i) {
    if (countEl) countEl.textContent = String(i + 1).padStart(2, '0');
  }

  function goTo(target, viaHash) {
    if (!engaged) {
      pages[clamp(target)].scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    target = clamp(target);
    if (target === index || animating) return;

    const forward = target > index;
    const current = pages[index];
    const incoming = pages[target];

    animating = true;
    root.classList.add('pageturn-animating');
    setPageNumber(target);

    incoming.classList.remove('is-next', 'is-prev');
    incoming.style.transition = 'none';
    incoming.classList.add(forward ? 'turn-in-forward-start' : 'turn-in-backward');
    if (forward) incoming.style.transform = 'translateX(8%) scale(.985)';
    else incoming.style.transform = 'rotateY(-14deg) translateX(-6%)';
    incoming.style.opacity = '0';
    incoming.style.zIndex = '2';
    void incoming.offsetWidth;

    window.requestAnimationFrame(() => {
      incoming.style.transition = '';
      incoming.style.transform = '';
      incoming.style.opacity = '';
      incoming.classList.remove('turn-in-backward', 'turn-in-forward-start');
      incoming.classList.add('is-current');

      current.classList.remove('is-current');
      current.classList.add(forward ? 'turn-out-forward' : 'turn-out-backward');
    });

    const finish = () => {
      current.classList.remove('turn-out-forward', 'turn-out-backward', 'is-current');
      current.style.transform = '';
      current.style.opacity = '';
      current.style.zIndex = '';
      incoming.style.zIndex = '';

      index = target;
      applyStaticState();
      root.classList.remove('pageturn-animating');
      animating = false;

      incoming.scrollTop = 0;
      focusPage(incoming);

      if (!viaHash && incoming.id) {
        history.replaceState(null, '', `#${incoming.id}`);
      }
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    };

    current.addEventListener('transitionend', onEnd, { once: true });
    function onEnd(e) {
      if (e.target !== current) return;
      finish();
    }
    window.setTimeout(() => { if (animating) finish(); }, 900);
  }

  function focusPage(page) {
    const heading = page.querySelector('h1, h2, [tabindex="-1"]');
    const el = heading || page;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
  }

  function clamp(i) { return Math.max(0, Math.min(pages.length - 1, i)); }
  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function onWheel(e) {
    if (!engaged) return;
    const page = pages[index];
    const atTop = page.scrollTop <= 0;
    const atBottom = page.scrollTop + page.clientHeight >= page.scrollHeight - 2;
    const goingDown = e.deltaY > 0;

    if ((goingDown && !atBottom) || (!goingDown && !atTop)) {
      return;
    }
    // e.preventDefault(); <-- Commented out to allow free, smooth scrolling!
    const now = Date.now();
    if (animating || now < wheelCooldown) return;
    if (Math.abs(e.deltaY) < 8) return;
    wheelCooldown = now + 820;
    goingDown ? next() : prev();
  }

  function onKey(e) {
    if (!engaged || animating) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    switch (e.key) {
      case 'ArrowDown': case 'PageDown': e.preventDefault(); next(); break;
      case 'ArrowUp': case 'PageUp': e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); goTo(0); break;
      case 'End': e.preventDefault(); goTo(pages.length - 1); break;
      default: break;
    }
  }

  let touchStartY = 0;
  let touchActive = false;
  function onTouchStart(e) { if (engaged) { touchStartY = e.touches[0].clientY; touchActive = true; } }
  function onTouchEnd(e) {
    if (!engaged || !touchActive) return;
    touchActive = false;
    const dy = touchStartY - e.changedTouches[0].clientY;
    const page = pages[index];
    const atTop = page.scrollTop <= 0;
    const atBottom = page.scrollTop + page.clientHeight >= page.scrollHeight - 2;
    if (Math.abs(dy) < 60) return;
    if (dy > 0 && atBottom) next();
    else if (dy < 0 && atTop) prev();
  }

  function onAnchorClick(e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    if (!id) return;
    const target = pages.findIndex((p) => p.id === id);
    if (target === -1) return;
    if (engaged) {
      e.preventDefault();
      goTo(target);
    }
  }

  function engage() {
    if (engaged) return;
    engaged = true;
    root.classList.add('pageturn-on');
    buildPager();
    if (pager) pager.hidden = false;
    const hashIndex = pages.findIndex((p) => p.id === location.hash.slice(1));
    index = hashIndex > -1 ? hashIndex : 0;
    applyStaticState();
    setPageNumber(index);
    showHintBriefly();
    showIntroOnce();

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('click', onAnchorClick);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function disengage() {
    if (!engaged) return;
    engaged = false;
    root.classList.remove('pageturn-on', 'pageturn-animating');
    if (pager) pager.hidden = true;
    if (intro) { intro.classList.remove('is-visible'); intro.hidden = true; }
    pages.forEach((page) => {
      page.classList.remove(
        'pageturn-page', 'is-current', 'is-next', 'is-prev',
        'turn-out-forward', 'turn-out-backward', 'turn-in-backward', 'turn-in-forward-start'
      );
      page.style.transform = '';
      page.style.opacity = '';
      page.style.zIndex = '';
      page.style.transition = '';
    });
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('click', onAnchorClick);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function evaluate() {
    const shouldEngage = canEngage.matches && !prefersReducedMotion.matches;
    if (shouldEngage) engage();
    else disengage();
  }

  addMQListener(canEngage, evaluate);
  addMQListener(prefersReducedMotion, evaluate);

  function addMQListener(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }

  if (document.readyState === 'complete') evaluate();
  else window.addEventListener('load', evaluate);
})();
