/* ==========================================================================
   DR. A.P.J. ABDUL KALAM — EDITORIAL TRIBUTE ENGINE
   Video crossfade · Scene tracking · Scramble decode · Reveal system
   ========================================================================== */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  /* ---- Elements ---- */
  const videos      = $$('.stage__video');
  const gate        = $('#gate');
  const gateEnter   = $('#gateEnter');
  const gateSilent  = $('#gateSilent');
  const music       = $('#bgMusic');
  const audioToggle = $('#audioToggle');
  const audioLabel  = $('#audioLabel');
  const progressBar = $('#progressBar');
  const topNav      = $('#topNav');
  const sceneLabel  = $('#sceneLabel');
  const sections    = $$('[data-scene]');
  const railItems   = $$('[data-rail]');
  const replayBtn   = $('#replayBtn');
  const portrait    = $('#finalePortrait');

  const SCENE_NAMES = ['01 · THE AWAKENING', '02 · THE ARCHITECT', '03 · THE ASCENT', '04 · THE IMMORTAL'];
  let activeScene = -1;

  /* Optional portrait — remove gracefully if file missing */
  if (portrait) portrait.addEventListener('error', () => portrait.remove());

  /* ------------------------------------------------------------------
     1. VIDEO ARMING — muted autoplay, no native controls ever visible
  ------------------------------------------------------------------ */
  videos.forEach((v) => {
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    const p = v.play();
    if (p) p.catch(() => {});
  });

  /* ------------------------------------------------------------------
     2. SCENE CROSSFADER
  ------------------------------------------------------------------ */
  function setScene(i) {
    if (i === activeScene || i < 0 || i >= videos.length) return;
    activeScene = i;
    videos.forEach((v, idx) => {
      v.classList.toggle('is-active', idx === i);
      if (idx === i) {
        v.play().catch(() => {});
      } else {
        // Delay pause so the outgoing video keeps moving during crossfade
        setTimeout(() => { if (activeScene !== idx) v.pause(); }, 1700);
      }
    });
    railItems.forEach((r) => r.classList.toggle('is-active', +r.dataset.rail === i));
    if (sceneLabel && SCENE_NAMES[i]) scramble(sceneLabel, SCENE_NAMES[i]);
  }

  const sceneIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) setScene(+en.target.dataset.scene);
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  sections.forEach((s) => sceneIO.observe(s));

  /* ------------------------------------------------------------------
     3. SCRAMBLE-DECODE TEXT
  ------------------------------------------------------------------ */
  const GLYPHS = 'AKMISLVX0123456789·—/✦';
  function scramble(el, text) {
    if (!el) return;
    const final = text ?? el.dataset.final ?? el.textContent;
    el.dataset.final = final;
    if (reduced) { el.textContent = final; return; }
    if (el._raf) cancelAnimationFrame(el._raf);
    const len = final.length;
    const dur = Math.min(900, 140 + len * 20);
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const reveal = Math.floor(t * len);
      let out = '';
      for (let i = 0; i < len; i++) {
        const ch = final[i];
        out += i < reveal || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (t < 1) el._raf = requestAnimationFrame(frame);
      else el.textContent = final;
    };
    el._raf = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------
     4. SCROLL REVEALS (line masks, rises, gold rules)
  ------------------------------------------------------------------ */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-inview');
      en.target.querySelectorAll('[data-scramble]').forEach((el) => {
        if (el.dataset.done) return;
        el.dataset.done = '1';
        scramble(el);
      });
      revealIO.unobserve(en.target);
    });
  }, { threshold: 0.25 });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));

  /* ------------------------------------------------------------------
     5. PROGRESS BAR + NAV STATE
  ------------------------------------------------------------------ */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
      topNav.classList.toggle('is-scrolled', window.scrollY > 40);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     6. AUDIO — GATE + TOGGLE
  ------------------------------------------------------------------ */
  function setAudioState(on) {
    document.body.classList.toggle('is-muted', !on);
    audioLabel.textContent = on ? 'SOUND ON' : 'SOUND OFF';
  }

  function openGate(withSound) {
    if (withSound && music) {
      music.volume = 0.85;
      music.play()
        .then(() => setAudioState(true))
        .catch(() => setAudioState(false));
    } else {
      setAudioState(false);
    }
    gate.classList.add('is-open');
  }

  gateEnter.addEventListener('click', () => openGate(true));
  gateSilent.addEventListener('click', () => openGate(false));

  audioToggle.addEventListener('click', () => {
    if (!music) return;
    if (music.paused) {
      music.play().then(() => setAudioState(true)).catch(() => {});
    } else {
      music.pause();
      setAudioState(false);
    }
  });

  /* ------------------------------------------------------------------
     7. REPLAY
  ------------------------------------------------------------------ */
  replayBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });
})();
/* ==========================================================================
   FINALE PORTRAIT — SUBTLE SCROLL PARALLAX (premium touch)
   ========================================================================== */
(() => {
  const portrait = document.getElementById('finalePortrait');
  if (!portrait) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  function parallax() {
    const rect = portrait.getBoundingClientRect();
    const vh = window.innerHeight;
    // How far the portrait has entered the viewport (0 → 1)
    const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
    const shift = (progress - 0.5) * -60; // gentle drift, max ±30px
    portrait.style.transform = `translateY(${shift}px)`;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
  }, { passive: true });
  parallax();
})();
/* ==========================================================================
   PEOPLE'S PRESIDENT PORTRAIT — SCENE VISIBILITY CONTROL
   ========================================================================== */
(function () {
  'use strict';
  const presidentPortrait = document.getElementById('presidentPortrait');
  if (!presidentPortrait) return;

  const panels = document.querySelectorAll('.story-panel');

  function updatePresidentPortrait() {
    const vh = window.innerHeight;
    let activeScene = 1;
    panels.forEach((panel) => {
      const rect = panel.getBoundingClientRect();
      if (rect.top <= vh * 0.55) {
        activeScene = parseInt(panel.dataset.scene, 10);
      }
    });
    // Visible ONLY in the People's President scene (scene 4)
    presidentPortrait.classList.toggle('visible', activeScene === 4);
  }

  window.addEventListener('scroll', updatePresidentPortrait, { passive: true });
  window.addEventListener('resize', updatePresidentPortrait);
  window.addEventListener('load', updatePresidentPortrait);
  updatePresidentPortrait();
})();