(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Typewriter (hero punchline, runs once) ──
  const typed = document.querySelector('.typed');
  if (typed) {
    const text = typed.dataset.text;
    if (reduceMotion) {
      typed.textContent = text;
    } else {
      let i = 0;
      const tick = () => {
        typed.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(tick, 38 + Math.random() * 40);
      };
      setTimeout(tick, 500);
    }
  }

  // ── Headshot height = name + punchline + sub-punchline block ──
  const introText = document.querySelector('.intro-text');
  const headshot = document.querySelector('.headshot');
  if (introText && headshot && 'ResizeObserver' in window) {
    new ResizeObserver(() => {
      headshot.style.height = introText.offsetHeight + 'px';
    }).observe(introText);
  }

  // ── Sub-punchline runs the same width as the punchline above it ──
  const punchGhost = document.querySelector('.punch-ghost');
  const subpunch = document.querySelector('.subpunch');
  if (punchGhost && subpunch) {
    const matchWidth = () => {
      const range = document.createRange();
      range.selectNodeContents(punchGhost);
      subpunch.style.maxWidth = Math.ceil(range.getBoundingClientRect().width) + 'px';
    };
    matchWidth();
    if (document.fonts) document.fonts.ready.then(matchWidth);
    if ('ResizeObserver' in window) new ResizeObserver(matchWidth).observe(punchGhost.parentElement);
  }

  // ── Scroll reveals ──
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  // ── Count-up metrics ──
  const counters = document.querySelectorAll('.count');
  const runCount = (el) => {
    const to = parseFloat(el.dataset.to);
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    const decimals = (el.dataset.to.split('.')[1] || '').length;
    const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (reduceMotion) { el.textContent = pre + fmt(to) + suf; return; }
    const start = performance.now();
    const dur = 1200;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(p < 1 ? to * eased : to) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  // ── Pages: show one page at a time; the nav (and in-page links) switch pages ──
  const links = document.querySelectorAll('.nav-link');
  const pages = [...document.querySelectorAll('.page')];
  const route = () => {
    const id = decodeURIComponent(location.hash.slice(1)) || 'home';
    const target = document.getElementById(id);
    const page = pages.find((p) => p.dataset.page === id)
      || (target && target.closest('.page'))
      || pages[0];
    pages.forEach((p) => { p.hidden = p !== page; });

    const linkIds = [...links].map((l) => l.dataset.section);
    const activeId = linkIds.includes(id) ? id : page.dataset.page;
    links.forEach((l) => l.classList.toggle('is-active', l.dataset.section === activeId));

    // Jump to a sub-section (e.g. #testimonials) or to the top of the page
    const isPageKey = page.dataset.page === id || id === 'home';
    requestAnimationFrame(() => {
      if (target && !isPageKey) {
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    });
  };
  window.addEventListener('hashchange', route);
  route();

  // ── Work filters ──
  const filters = document.querySelectorAll('.filter');
  const cards = document.querySelectorAll('.work-card');
  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => b.classList.toggle('is-active', b === btn));
      const f = btn.dataset.filter;
      cards.forEach((c) => c.classList.toggle('is-hidden', f !== 'all' && c.dataset.cat !== f));
    });
  });

  // ── Case-study tabs (Product page) ──
  const tabs = [...document.querySelectorAll('.wtn-tab')];
  const selectTab = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const next = tabs[(i + d + tabs.length) % tabs.length];
      selectTab(next); next.focus();
    });
  });

  // ── Testimonials carousel ──
  const track = document.querySelector('.carousel-track');
  if (track) {
    const slides = [...track.children];
    const dotsWrap = document.querySelector('.dots');
    const dots = slides.map((_, i) => {
      const d = document.createElement('button');
      d.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
      d.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(d);
      return d;
    });
    const step = () => slides[1].offsetLeft - slides[0].offsetLeft;
    const currentIndex = () => Math.round(track.scrollLeft / step());
    const goTo = (i) => {
      const max = slides.length - 1;
      i = Math.max(0, Math.min(i, max));
      track.scrollTo({ left: i * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    const updateDots = () => {
      const i = currentIndex();
      dots.forEach((d, j) => d.classList.toggle('is-active', j === i));
    };
    document.querySelector('.car-btn.prev').addEventListener('click', () => goTo(currentIndex() - 1));
    document.querySelector('.car-btn.next').addEventListener('click', () => goTo(currentIndex() + 1));
    track.addEventListener('scroll', () => requestAnimationFrame(updateDots), { passive: true });
    updateDots();
  }

  // ── Contact form (front-end only; wire to Formspree/Netlify/etc.) ──
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = form.querySelector('.form-note');
      if (!form.checkValidity()) {
        note.textContent = 'Please add your name and a valid email.';
        return;
      }
      note.textContent = 'Thanks! This form isn’t connected yet — hook it up to a form service.';
      form.reset();
    });
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
