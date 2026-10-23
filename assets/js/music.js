'use strict';

/* =====================================================================
   Ambient music player
   ---------------------------------------------------------------------
   Visitors can turn the music ON/OFF and adjust the VOLUME up/down.

   The sound is GENERATED in the browser with the Web Audio API — a soft,
   slowly-evolving CRT-era pad (a few detuned sine/triangle voices through
   a gentle low-pass filter and slow tremolo). This means:
     - no external audio file to host or download,
     - no music-licensing concern,
     - it still works offline.

   It is OFF by default (we never autoplay — browsers block it anyway and
   it is the respectful default). The on/off state and volume are saved to
   localStorage and restored on the next visit (but playback only resumes
   after the visitor interacts, per browser autoplay policy).
   ===================================================================== */

(function initMusicPlayer() {
  const player = document.getElementById('music-player');
  const toggle = document.getElementById('music-toggle');
  const volume = document.getElementById('music-volume');
  if (!player || !toggle || !volume) return;

  // Web Audio must exist; otherwise leave the player hidden entirely.
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  player.hidden = false;

  const STORE_KEY = 'ambient-music';
  const toggleIcon = toggle.querySelector('i');

  let ctx = null;
  let master = null;      // master gain (volume)
  let voices = [];        // oscillator + per-voice nodes, so we can stop cleanly
  let tremolo = null;     // slow amplitude wobble
  let playing = false;

  // Restore saved preferences.
  const saved = readState();
  let vol = saved.volume; // 0..1
  volume.value = String(Math.round(vol * 100));
  reflectVolumeUI(vol);

  // ---- Build / tear down the generative audio graph --------------------
  function buildGraph() {
    ctx = new AudioCtx();

    master = ctx.createGain();
    master.gain.value = 0; // fade in
    master.connect(ctx.destination);

    // Gentle low-pass keeps the pad soft and warm.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.6;
    lp.connect(master);

    // Slow tremolo (amplitude wobble) for a living, ambient feel.
    tremolo = ctx.createGain();
    tremolo.gain.value = 1;
    tremolo.connect(lp);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;   // very slow
    lfoGain.gain.value = 0.18;
    lfo.connect(lfoGain);
    lfoGain.connect(tremolo.gain);
    lfo.start();

    // A soft minor-ish chord: detuned voices for a wide, calm pad.
    // Frequencies (Hz) ~ A2, E3, A3, C4, E4 — pleasant and unobtrusive.
    const notes = [
      { f: 110.0, type: 'sine',     g: 0.22 },
      { f: 164.8, type: 'sine',     g: 0.16 },
      { f: 220.0, type: 'triangle', g: 0.12 },
      { f: 261.6, type: 'sine',     g: 0.10 },
      { f: 329.6, type: 'triangle', g: 0.08 },
    ];

    voices = notes.map((n, i) => {
      const osc = ctx.createOscillator();
      osc.type = n.type;
      osc.frequency.value = n.f;
      osc.detune.value = (i - 2) * 4; // slight spread so it doesn't beat harshly

      const g = ctx.createGain();
      g.gain.value = n.g;

      osc.connect(g);
      g.connect(tremolo);
      osc.start();
      return { osc, g, lfo: i === 0 ? lfo : null };
    });

    // keep a reference to the lfo for teardown
    voices._lfo = lfo;
  }

  function teardownGraph() {
    if (!ctx) return;
    try {
      voices.forEach((v) => { try { v.osc.stop(); } catch (_) {} });
      if (voices._lfo) { try { voices._lfo.stop(); } catch (_) {} }
    } catch (_) {}
    voices = [];
    const c = ctx;
    ctx = null; master = null; tremolo = null;
    // Give the fade-out a moment before closing the context.
    window.setTimeout(() => { try { c.close(); } catch (_) {} }, 400);
  }

  // ---- Play / pause (the on/off control) -------------------------------
  function play() {
    if (playing) return;
    buildGraph();
    if (ctx.state === 'suspended') ctx.resume();
    // Smooth fade-in to the current volume.
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), now + 1.2);

    playing = true;
    player.classList.add('is-playing');
    toggle.setAttribute('aria-pressed', 'true');
    toggle.setAttribute('aria-label', 'Pause ambient music');
    if (toggleIcon) toggleIcon.className = 'ri-pause-fill';
    saveState();
  }

  function pause() {
    if (!playing) return;
    playing = false;
    player.classList.remove('is-playing');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Play ambient music');
    if (toggleIcon) toggleIcon.className = 'ri-play-fill';

    // Fade out, then stop the oscillators.
    if (ctx && master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    }
    teardownGraph();
    saveState();
  }

  // ---- Volume (up / down) ----------------------------------------------
  function applyVolume(v) {
    vol = Math.min(1, Math.max(0, v));
    reflectVolumeUI(vol);
    if (ctx && master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(Math.max(0.0001, vol), now, 0.08);
    }
    saveState();
  }

  function reflectVolumeUI(v) {
    player.style.setProperty('--vol', `${Math.round(v * 100)}%`);
  }

  // ---- Persistence ------------------------------------------------------
  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      const v = typeof raw.volume === 'number' ? raw.volume : 0.6;
      return { volume: Math.min(1, Math.max(0, v)), wasPlaying: !!raw.playing };
    } catch (_) {
      return { volume: 0.6, wasPlaying: false };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ playing, volume: vol }));
    } catch (_) {}
  }

  // ---- Wire up controls -------------------------------------------------
  toggle.addEventListener('click', () => { playing ? pause() : play(); });

  volume.addEventListener('input', () => applyVolume(Number(volume.value) / 100));

  // Pause when the tab is hidden; let the user resume when they return.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) pause();
  });

  // If the user previously had it on, offer to resume on their first gesture
  // (browsers block starting audio without interaction).
  if (saved.wasPlaying) {
    const resumeOnce = () => {
      document.removeEventListener('pointerdown', resumeOnce);
      document.removeEventListener('keydown', resumeOnce);
      play();
    };
    document.addEventListener('pointerdown', resumeOnce, { once: true });
    document.addEventListener('keydown', resumeOnce, { once: true });
  }
})();
