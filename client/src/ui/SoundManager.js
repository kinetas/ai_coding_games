// Singleton — Web Audio API, 파일 없이 프로그래밍 방식 사운드 생성
let _inst = null;

export class SoundManager {
  static get() { return _inst ?? (_inst = new SoundManager()); }

  constructor() {
    this._ctx          = null;
    this._bgmOut       = null;
    this._sfxOut       = null;
    this._bgmSess      = null;   // 현재 BGM 세션 { gain, oscs[] }
    this._sessions     = new Set(); // 모든 살아있는 세션 (페이드 중 포함)
    this._bgmTimeout   = null;
    this._bgmLoopAt    = 0;
    this._bgmTag       = null;
    this._pendingTag   = null;
    this._bgmDef       = null;
    this._hoverTs      = 0;
    this._cardHoverTs  = 0;
  }

  // ── 초기화 & unlock ─────────────────────────────────────────

  _init() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();

    const m = this._ctx.createGain();
    m.gain.value = 1;
    m.connect(this._ctx.destination);

    this._bgmOut = this._ctx.createGain();
    this._bgmOut.gain.value = 0;   // BGM 전체 음소거
    this._bgmOut.connect(m);

    this._sfxOut = this._ctx.createGain();
    this._sfxOut.gain.value = 0.5;
    this._sfxOut.connect(m);

    // onstatechange: promise보다 신뢰성 높음 — state가 'running'으로 바뀔 때마다 호출
    this._ctx.onstatechange = () => {
      if (this._ctx.state === 'running') this._applyPending();
    };

    // capture:true → Phaser 핸들러보다 먼저 실행
    document.addEventListener('pointerdown', () => this._tryResume(), { passive: true, capture: true });
  }

  _tryResume() {
    if (!this._ctx) return;
    if (this._ctx.state === 'running') {
      this._applyPending();
    } else {
      this._ctx.resume().catch(() => {});
      // 실제 BGM 시작은 onstatechange 콜백이 처리
    }
  }

  _applyPending() {
    if (!this._pendingTag) return;
    if (this._bgmTag === this._pendingTag) return;
    if (this._ctx.state !== 'running') return;
    this._startBGM(this._pendingTag);
  }

  // ── BGM 공개 API ─────────────────────────────────────────────

  playLobbyBGM() {
    this._init();
    this._pendingTag = 'lobby';
    this._tryResume();
  }

  playGameBGM() {
    this._init();
    this._pendingTag = 'game';
    this._tryResume();
  }

  stopBGM() {
    if (this._bgmTimeout) { clearTimeout(this._bgmTimeout); this._bgmTimeout = null; }
    this._bgmDef    = null;
    this._pendingTag = null;
    this._bgmTag    = null;
    this._bgmSess   = null;
    this._killAllSessions(true);
  }

  // ── BGM 내부 ─────────────────────────────────────────────────

  _startBGM(tag) {
    if (this._bgmTimeout) { clearTimeout(this._bgmTimeout); this._bgmTimeout = null; }
    this._bgmDef = null;

    // 진행 중/페이드 중인 모든 세션을 즉시 무음 처리
    this._killAllSessions(false);

    this._bgmTag = tag;

    const gain = this._ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this._bgmOut);

    const sess = { gain, oscs: [] };
    this._bgmSess = sess;
    this._sessions.add(sess);

    const t = this._ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.25);   // 0.25초 fade-in

    const C3=130.81, D3=146.83, E3=164.81, G3=196,
          A3=220,   B3=246.94,  C4=261.63, D4=293.66, E4=329.63,
          F4=349.23, G4=392,    A4=440,    B4=493.88, C5=523.25;

    if (tag === 'lobby') {
      // C장조 아르페지오 — 65 BPM, 32박자 ≈ 29.5초 루프
      this._bgmDef = {
        bpm: 65, type: 'triangle',
        notes: [
          {f:C4,b:2},{f:E4,b:1},{f:G4,b:1},
          {f:A4,b:2},{f:G4,b:1},{f:E4,b:1},
          {f:F4,b:2},{f:E4,b:1},{f:D4,b:1},
          {f:C4,b:4},
          {f:A3,b:2},{f:C4,b:1},{f:E4,b:1},
          {f:G4,b:2},{f:E4,b:1},{f:C4,b:1},
          {f:G3,b:1},{f:A3,b:1},{f:B3,b:1},{f:C4,b:1},
          {f:E4,b:3},{f:0,b:1},
        ],
      };
    } else {
      // A단조 긴장 멜로디 — 100 BPM, 16박자 ≈ 9.6초 루프
      this._bgmDef = {
        bpm: 100, type: 'triangle',
        notes: [
          {f:A3,b:1},{f:C4,b:0.5},{f:E4,b:0.5},
          {f:G4,b:0.5},{f:F4,b:0.5},{f:E4,b:0.5},{f:D4,b:0.5},
          {f:C4,b:1},{f:E4,b:0.5},{f:A4,b:0.5},
          {f:G4,b:1.5},{f:0,b:0.5},
          {f:F4,b:1},{f:D4,b:0.5},{f:E4,b:0.5},
          {f:G4,b:0.5},{f:A4,b:0.5},{f:B4,b:0.5},{f:C5,b:0.5},
          {f:A4,b:1},{f:G4,b:0.5},{f:E4,b:0.5},
          {f:A3,b:2},
        ],
      };
    }

    this._bgmLoopAt = t + 0.05;
    this._scheduleBGMLoop();
  }

  // 모든 살아있는 세션을 종료 (fade=true → 0.2초 페이드, false → 즉시)
  _killAllSessions(fade) {
    if (!this._ctx) return;
    const fadeDur = fade ? 0.2 : 0;
    const t = this._ctx.currentTime;

    for (const sess of [...this._sessions]) {
      this._sessions.delete(sess);

      const stopAt = t + (fade ? 0.2 : 0.01);

      // 오실레이터 명시적 중단
      for (const osc of sess.oscs) {
        try { osc.stop(stopAt); } catch (_) {}
      }
      sess.oscs = [];

      // GainNode 무음
      sess.gain.gain.cancelScheduledValues(t);
      sess.gain.gain.setValueAtTime(sess.gain.gain.value, t);
      if (fade) {
        sess.gain.gain.linearRampToValueAtTime(0, t + fadeDur);
      } else {
        sess.gain.gain.setValueAtTime(0, t);
      }

      // 오디오 그래프에서 분리
      const delay = Math.round((stopAt - t + 0.05) * 1000);
      setTimeout(() => { try { sess.gain.disconnect(); } catch (_) {} }, delay);
    }
  }

  _scheduleBGMLoop() {
    if (!this._bgmDef || !this._ctx || !this._bgmSess) return;
    const { notes, bpm, type } = this._bgmDef;
    const beat    = 60 / bpm;
    const loopDur = notes.reduce((s, n) => s + n.b, 0) * beat;

    const sess = this._bgmSess;   // 현재 세션 캡처
    let t = this._bgmLoopAt;
    notes.forEach(({ f, b }) => {
      if (f > 0) this._scheduleNote(f, t, b * beat * 0.82, type, sess);
      t += b * beat;
    });

    this._bgmLoopAt += loopDur;
    const delay = Math.max(50, (this._bgmLoopAt - this._ctx.currentTime - 0.2) * 1000);
    this._bgmTimeout = setTimeout(() => this._scheduleBGMLoop(), delay);
  }

  _scheduleNote(freq, when, dur, type, sess) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(1,    when + 0.04);
    g.gain.setValueAtTime(0.65,          when + dur * 0.55);
    g.gain.linearRampToValueAtTime(0,    when + dur);
    osc.connect(g);
    g.connect(sess.gain);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    sess.oscs.push(osc);
    osc.onended = () => {
      const idx = sess.oscs.indexOf(osc);
      if (idx !== -1) sess.oscs.splice(idx, 1);
    };
  }

  // ctx가 이미 running 상태인지 (게임에서 돌아온 경우 등)
  isRunning() {
    return !!(this._ctx && this._ctx.state === 'running');
  }

  // ── SFX ──────────────────────────────────────────────────────

  // UI 버튼 호버 (80ms cooldown)
  sfxHover() {
    const now = Date.now();
    if (now - this._hoverTs < 80) return;
    this._hoverTs = now;
    if (!this._ctx || this._ctx.state !== 'running') return;
    const ctx = this._ctx, t = ctx.currentTime;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 880;
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(g); g.connect(this._sfxOut);
    osc.start(t); osc.stop(t + 0.06);
  }

  // UI 버튼 클릭
  sfxClick() {
    if (!this._ctx || this._ctx.state !== 'running') return;
    const ctx = this._ctx, t = ctx.currentTime;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(650, t + 0.09);
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(g); g.connect(this._sfxOut);
    osc.start(t); osc.stop(t + 0.15);
  }

  // 카드 호버 (100ms cooldown)
  sfxCardHover() {
    const now = Date.now();
    if (now - this._cardHoverTs < 100) return;
    this._cardHoverTs = now;
    if (!this._ctx || this._ctx.state !== 'running') return;
    const ctx = this._ctx, t = ctx.currentTime;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 540;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g); g.connect(this._sfxOut);
    osc.start(t); osc.stop(t + 0.1);
  }

  // 카드 조합 드롭 — C5→E5→G5 상행 3화음
  sfxCombineDrop() {
    if (!this._ctx || this._ctx.state !== 'running') return;
    const ctx = this._ctx, t = ctx.currentTime;
    [[523.25, 0], [659.25, 0.11], [783.99, 0.22]].forEach(([f, dt]) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
      const s = t + dt;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.42, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.3);
      osc.connect(g); g.connect(this._sfxOut);
      osc.start(s); osc.stop(s + 0.32);
    });
  }
}
