'use strict';

/* =====================================================================
   Music player
   ---------------------------------------------------------------------
   Visitors can turn the music ON/OFF (play / pause) and adjust the
   VOLUME up/down. The on/off + volume choice is remembered across visits.

   TWO SOURCES, picked automatically:

   1) YOUR OWN TRACK (preferred). Drop an audio file in the repo at:
          assets/audio/track.mp3
      ...and it plays that file on a loop. Nothing else to change.
      (You can point at a different name/URL by setting
       `data-src` on the #music-player element in index.html — see below.)

   2) GENERATED FALLBACK. If no audio file is found (or it fails to load),
      the player falls back to a soft, in-browser ambient pad generated
      with the Web Audio API — so the control never breaks and there is
      no licensing concern for the default.

   It is OFF by default (we never autoplay — browsers block it anyway and
   it is the respectful default). Playback only starts after the visitor
   clicks play (or, if they had it on last time, after their first click).

   ── HOW TO USE YOUR OWN MP3 ─────────────────────────────────────────
   • Add your file to the repo as:  assets/audio/track.mp3
     (commit + push, or drop it in via GitHub's "Add file" button).
   • That's it — it will loop as the site's background music.
   • To use a different filename or an external URL instead, set:
       <div id="music-player" ... data-src="assets/audio/my-song.mp3">
     Multiple fallbacks are allowed, comma-separated:
       data-src="assets/audio/song.mp3, assets/audio/song.ogg"
   ===================================================================== */

(function initMusicPlayer() {
  const player = document.getElementById('music-player');
  const toggle = document.getElementById('music-toggle');
  const volume = document.getElementById('music-volume');
  if (!player || !toggle || !volume) return;

  const STORE_KEY = 'ambient-music';
  const toggleIcon = toggle.querySelector('i');
  const label = document.getElementById('music-label');

  // Candidate audio sources: the data-src attribute (comma-separated) wins,
  // otherwise the conventional default path. The first one that loads is used.
  const sources = (player.dataset.src || 'assets/audio/track.mp3')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  // State shared by both backends.
  let playing = false;
  const saved = readState();
  let vol = saved.volume; // 0..1
  volume.value = String(Math.round(vol * 100));
  reflectVolumeUI(vol);

  player.hidden = false;

  // =====================================================================
  //  Backend selection: try the <audio> file first, fall back to Web Audio
  // =====================================================================
  let backend = null;

  probeAudioFile(sources).then((workingSrc) => {
    if (workingSrc) {
      backend = makeFileBackend(workingSrc);
      if (label) label.textContent = 'music';
    } else if (AudioCtx) {
      backend = makeGeneratedBackend();
      if (label) label.textContent = 'ambient';
    } else {
      // No file and no Web Audio support: hide the player, nothing to play.
      player.hidden = true;
      return;
    }
    wireControls();
    maybeAutoResume();
  });

  /* Resolve to the first source that can actually load, else null. */
  function probeAudioFile(list) {
    return new Promise((resolve) => {
      if (!list.length) { resolve(null); return; }
      let i = 0;
      const tryNext = () => {
        if (i >= list.length) { resolve(null); return; }
        const src = list[i++];
        const a = new Audio();
        a.preload = 'auto';
        const done = (ok) => {
          a.removeEventListener('canplaythrough', onOk);
          a.removeEventListener('loadeddata', onOk);
          a.removeEventListener('error', onErr);
          if (ok) resolve(src); else tryNext();
        };
        const onOk = () => done(true);
        const onErr = () => done(false);
        a.addEventListener('canplaythrough', onOk, { once: true });
        a.addEventListener('loadeddata', onOk, { once: true });
        a.addEventListener('error', onErr, { once: true });
        a.src = src;
        // Safety timeout: if nothing fires, treat as unavailable.
        window.setTimeout(() => { if (a.readyState < 2) done(false); }, 4000);
      };
      tryNext();
    });
  }

  // ---------------------------------------------------------------------
  //  Backend 1: a real audio file (your MP3), looped
  // ---------------------------------------------------------------------
  function makeFileBackend(src) {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = vol;
    return {
      play() {
        audio.volume = vol;
        // play() returns a promise that can reject if blocked; ignore safely.
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
      },
      pause() { audio.pause(); },
      setVolume(v) { audio.volume = v; },
    };
  }

  // ---------------------------------------------------------------------
  //  Backend 2: generated ambient pad (Web Audio fallback)
  // ---------------------------------------------------------------------
  function makeGeneratedBackend() {
    let ctx = null, master = null, voices = [], lfoRef = null;

    function build() {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.6;
      lp.connect(master);

      const tremolo = ctx.createGain();
      tremolo.gain.value = 1; tremolo.connect(lp);
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.08; lfoGain.gain.value = 0.18;
      lfo.connect(lfoGain); lfoGain.connect(tremolo.gain); lfo.start();
      lfoRef = lfo;

      const notes = [
        { f: 110.0, type: 'sine',     g: 0.22 },
        { f: 164.8, type: 'sine',     g: 0.16 },
        { f: 220.0, type: 'triangle', g: 0.12 },
        { f: 261.6, type: 'sine',     g: 0.10 },
        { f: 329.6, type: 'triangle', g: 0.08 },
      ];
      voices = notes.map((n, i) => {
        const osc = ctx.createOscillator();
        osc.type = n.type; osc.frequency.value = n.f; osc.detune.value = (i - 2) * 4;
        const g = ctx.createGain(); g.gain.value = n.g;
        osc.connect(g); g.connect(tremolo); osc.start();
        return { osc };
      });
    }

    function destroy() {
      if (!ctx) return;
      try {
        voices.forEach((v) => { try { v.osc.stop(); } catch (_) {} });
        if (lfoRef) { try { lfoRef.stop(); } catch (_) {} }
      } catch (_) {}
      voices = []; lfoRef = null;
      const c = ctx; ctx = null; master = null;
      window.setTimeout(() => { try { c.close(); } catch (_) {} }, 400);
    }

    return {
      play() {
        build();
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), now + 1.2);
      },
      pause() {
        if (ctx && master) {
          const now = ctx.currentTime;
          master.gain.cancelScheduledValues(now);
          master.gain.setValueAtTime(master.gain.value, now);
          master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        }
        destroy();
      },
      setVolume(v) {
        if (ctx && master) {
          const now = ctx.currentTime;
          master.gain.cancelScheduledValues(now);
          master.gain.setTargetAtTime(Math.max(0.0001, v), now, 0.08);
        }
      },
    };
  }

  // =====================================================================
  //  Shared UI logic (works the same for either backend)
  // =====================================================================
  function playMusic() {
    if (playing || !backend) return;
    backend.play();
    playing = true;
    player.classList.add('is-playing');
    toggle.setAttribute('aria-pressed', 'true');
    toggle.setAttribute('aria-label', 'Pause music');
    if (toggleIcon) toggleIcon.className = 'ri-pause-fill';
    saveState();
  }

  function pauseMusic() {
    if (!playing || !backend) return;
    backend.pause();
    playing = false;
    player.classList.remove('is-playing');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Play music');
    if (toggleIcon) toggleIcon.className = 'ri-play-fill';
    saveState();
  }

  function applyVolume(v) {
    vol = Math.min(1, Math.max(0, v));
    reflectVolumeUI(vol);
    if (backend) backend.setVolume(vol);
    saveState();
  }

  function reflectVolumeUI(v) {
    player.style.setProperty('--vol', `${Math.round(v * 100)}%`);
  }

  function wireControls() {
    // Stop the first-load attention pulse as soon as the user engages the player.
    const markTouched = () => player.classList.add('touched');
    toggle.addEventListener('click', () => { markTouched(); playing ? pauseMusic() : playMusic(); });
    volume.addEventListener('input', () => { markTouched(); applyVolume(Number(volume.value) / 100); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && playing) pauseMusic();
    });
  }

  function maybeAutoResume() {
    if (!saved.wasPlaying) return;
    const resumeOnce = () => {
      document.removeEventListener('pointerdown', resumeOnce);
      document.removeEventListener('keydown', resumeOnce);
      playMusic();
    };
    document.addEventListener('pointerdown', resumeOnce, { once: true });
    document.addEventListener('keydown', resumeOnce, { once: true });
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
})();
