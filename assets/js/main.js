'use strict';

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') root.classList.remove('dark');
  else if (savedTheme === 'dark') root.classList.add('dark');
  else root.classList.toggle('dark', !window.matchMedia('(prefers-color-scheme: light)').matches);

  toggle.addEventListener('click', () => {
    root.classList.toggle('dark');
    localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light');
  });
}

function initMobileMenu() {
  const button = document.getElementById('menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!button || !menu) return;

  const setOpen = (isOpen) => {
    menu.classList.toggle('hidden', !isOpen);
    button.setAttribute('aria-expanded', String(isOpen));
    button.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  };

  button.addEventListener('click', () => setOpen(menu.classList.contains('hidden')));
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
}

function initTypingEffect() {
  const typingElement = document.getElementById('typing');
  if (!typingElement) return;

  const roles = ['BSIT Student at PUP', 'AWS & Cloud Enthusiast', 'Student Community Leader'];
  if (reduceMotion) {
    typingElement.textContent = roles[0];
    return;
  }

  let roleIndex = 0;
  let characterIndex = 0;
  let deleting = false;

  function typeNextCharacter() {
    const currentRole = roles[roleIndex];
    if (!deleting) {
      typingElement.textContent = currentRole.slice(0, ++characterIndex);
      if (characterIndex === currentRole.length) {
        deleting = true;
        window.setTimeout(typeNextCharacter, 1600);
        return;
      }
    } else {
      typingElement.textContent = currentRole.slice(0, --characterIndex);
      if (characterIndex === 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
      }
    }
    window.setTimeout(typeNextCharacter, deleting ? 45 : 90);
  }

  typeNextCharacter();
}

function initReveals() {
  const items = document.querySelectorAll('.reveal');
  if (reduceMotion) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    items.forEach((item) => {
      window.gsap.fromTo(
        item,
        { autoAlpha: 0, y: 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: item, start: 'top 88%', once: true },
          onStart: () => item.classList.add('is-visible'),
        },
      );
    });

    const aurora = document.querySelector('.aurora');
    if (aurora) {
      window.gsap.to(aurora, {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
      });
    }

    const timelineLine = document.querySelector('#experience .bg-gradient-to-b');
    if (timelineLine) {
      window.gsap.fromTo(
        timelineLine,
        { scaleY: 0, transformOrigin: 'top' },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: '#experience', start: 'top 70%', end: 'bottom 80%', scrub: true },
        },
      );
    }
    return;
  }

  items.forEach((item) => item.classList.add('reveal-pending'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('reveal-pending');
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  items.forEach((item) => observer.observe(item));
}

function initAsciiParallax() {
  const panels = Array.from(document.querySelectorAll('.ascii-art-panel'));
  if (panels.length < 3) return;

  // Reduced motion or no GSAP: drop any inline styles so CSS default opacity applies.
  if (reduceMotion || !window.gsap || !window.ScrollTrigger) {
    if (window.gsap) window.gsap.set(panels, { clearProps: 'opacity,visibility,yPercent' });
    return;
  }

  window.gsap.registerPlugin(window.ScrollTrigger);
  const peakOpacity = window.matchMedia('(max-width: 767px)').matches ? 0.1 : 0.12;

  // Visible by default (never autoAlpha: 0); ScrollTrigger only drives the parallax.
  window.gsap.set(panels, { autoAlpha: peakOpacity });

  panels.forEach((panel) => {
    const section = panel.closest('section');
    if (!section) return;
    window.gsap.fromTo(
      panel,
      { yPercent: 10 },
      {
        yPercent: -10,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.65,
          invalidateOnRefresh: true,
        },
      },
    );
  });
}

function initCardTilt() {
  if (reduceMotion || !window.matchMedia('(hover: hover)').matches) return;

  document.querySelectorAll('.tilt').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const bounds = card.getBoundingClientRect();
      const horizontalPosition = (event.clientX - bounds.left) / bounds.width - 0.5;
      const verticalPosition = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.setProperty('--ry', `${(horizontalPosition * 4).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${(-verticalPosition * 4).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const updateShadow = () => navbar.classList.toggle('shadow-lg', window.scrollY > 8);
  updateShadow();
  window.addEventListener('scroll', updateShadow, { passive: true });
}

function initAsciiWave() {
  const element = document.getElementById('ascii-wave');
  if (!element) return;

  const columns = 120;
  const rows = 10;
  const ramp = ' .:-=+*#%@';
  let time = 0;
  let running = false;
  let animationFrameId = null;
  let lastDraw = 0;

  function renderFrame(now) {
    if (!running) return;
    if (now - lastDraw > 66) {
      lastDraw = now;
      let output = '';
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < columns; x += 1) {
          const value =
            Math.sin(x * 0.14 + time) * 0.5 +
            Math.sin(x * 0.06 - time * 0.7 + y * 0.5) * 0.5;
          const normalized = (value + 1) / 2;
          const index = Math.max(0, Math.min(ramp.length - 1, Math.floor(normalized * (ramp.length - 1))));
          output += ramp[index];
        }
        output += '\n';
      }
      element.textContent = output;
      time += 0.12;
    }
    animationFrameId = window.requestAnimationFrame(renderFrame);
  }

  function renderStaticFrame() {
    let output = '';
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const value = Math.sin(x * 0.14) * 0.5 + Math.sin(x * 0.06 + y * 0.5) * 0.5;
        const normalized = (value + 1) / 2;
        output += ramp[Math.floor(normalized * (ramp.length - 1))];
      }
      output += '\n';
    }
    element.textContent = output;
  }

  if (reduceMotion) {
    renderStaticFrame();
    return;
  }

  const start = () => {
    if (running) return;
    running = true;
    lastDraw = 0;
    animationFrameId = window.requestAnimationFrame(renderFrame);
  };
  const stop = () => {
    running = false;
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
    });
    observer.observe(element);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
}

initTheme();
initMobileMenu();
initTypingEffect();
initCardTilt();
initNavbar();
initAsciiWave();

const currentYear = String(new Date().getFullYear());
document.querySelectorAll('[data-current-year]').forEach((element) => {
  element.textContent = currentYear;
  if (element instanceof HTMLTimeElement) element.dateTime = currentYear;
});

window.addEventListener('load', () => {
  initReveals();
  initAsciiParallax();
});
