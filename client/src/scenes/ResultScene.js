export class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }

  create(data) {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;

    const isWin = data.result === 'WIN';
    const isSolo = data.mode === 'solo';

    // ── 배경 ─────────────────────────────────────────────────
    this.add.rectangle(cx, cy, W, H, 0x1a0d05);
    for (let x = 160; x < W; x += 160) this.add.rectangle(x, cy, 1, H, 0xffffff, 0.04);
    for (let y = 60; y < H; y += 60)   this.add.rectangle(cx, y, W, 1, 0xffffff, 0.04);

    this.add.rectangle(cx, 22, W, 44, 0x231208);
    this.add.rectangle(cx, 44, W, 2, 0xb87333, 0.6);
    this.add.rectangle(cx, H - 22, W, 44, 0x231208);
    this.add.rectangle(cx, H - 44, W, 2, 0xb87333, 0.4);

    // PvP 승리 시 금빛 측면 장식, 패배 시 암적색
    const accentColor = (!isSolo && isWin) ? 0xd4af37 : (!isSolo && !isWin) ? 0x8b1a1a : 0xb87333;
    this.add.rectangle(36, cy, 2, H * 0.8, accentColor, 0.5);
    this.add.rectangle(W - 36, cy, 2, H * 0.8, accentColor, 0.5);

    // 횃불 또는 불꽃
    const torchIcon = (!isSolo && isWin) ? '✨' : '🔥';
    this.add.text(50, cy - 60, torchIcon, { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(W - 50, cy - 60, torchIcon, { fontSize: '32px' }).setOrigin(0.5);

    // ── 결과 타이틀 석판 ─────────────────────────────────────
    const titleY = cy - 230;
    const titleStoneColor = (!isSolo && isWin) ? 0x2d2208 : (!isSolo && !isWin) ? 0x2a0808 : 0x231208;
    this.add.rectangle(cx + 4, titleY + 4, 600, 90, 0x0a0603);
    this.add.rectangle(cx, titleY, 600, 90, titleStoneColor).setStrokeStyle(2, accentColor);

    const title = isSolo ? '전투 종료'
                : isWin  ? '🏆  정복 성공!'
                         : '💀  전선 붕괴';
    const tColor = (!isSolo && isWin) ? '#d4af37' : (!isSolo && !isWin) ? '#c84040' : '#d4af37';
    this.add.text(cx, titleY, title, {
      fontSize: '46px', color: tColor, fontStyle: 'bold',
      stroke: '#0a0603', strokeThickness: 5,
    }).setOrigin(0.5);

    // ── 점수 석판 ────────────────────────────────────────────
    const scoreY = cy - 50;
    this.add.rectangle(cx + 3, scoreY + 3, 560, 240, 0x0a0603);
    this.add.rectangle(cx, scoreY, 560, 240, 0x1e1005).setStrokeStyle(2, 0xb87333);

    // 상단 장식
    this.add.rectangle(cx, scoreY - 120 + 22, 560, 44, 0x2d1a08);
    this.add.rectangle(cx, scoreY - 120 + 44, 560, 1, 0xb87333, 0.5);
    this.add.text(cx, scoreY - 120 + 22, '— 전과 기록 —', {
      fontSize: '16px', color: '#8a7050', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // 솔로 점수
    if (isSolo) {
      const t = data.survivalTime || 0;
      const m = Math.floor(t / 60), s = Math.floor(t % 60);
      this.add.text(cx, scoreY - 26, `조합 횟수`, {
        fontSize: '14px', color: '#8a7050',
      }).setOrigin(0.5);
      this.add.text(cx, scoreY + 14, `${data.myScore}회`, {
        fontSize: '38px', color: '#e8c88a', fontStyle: 'bold',
        stroke: '#4a2200', strokeThickness: 3,
      }).setOrigin(0.5);
      this.add.text(cx, scoreY + 58, `생존 시간: ${m}분 ${String(s).padStart(2, '0')}초`, {
        fontSize: '18px', color: '#b87333', fontFamily: 'Georgia, serif',
      }).setOrigin(0.5);

      const prev = data.prevBest || { combineCount: 0, survivalTime: 0 };
      const prevM = Math.floor(prev.survivalTime / 60);
      const prevS = Math.floor(prev.survivalTime % 60);

      if (data.isNewRecord) {
        this.add.text(cx, scoreY + 90,
          '⭐  신기록 달성!', {
            fontSize: '22px', color: '#d4af37', fontStyle: 'bold',
            stroke: '#4a2200', strokeThickness: 3,
          }).setOrigin(0.5);
        this.add.text(cx, scoreY + 115,
          `이전 최고: ${prev.combineCount}회 / ${prevM}분 ${String(prevS).padStart(2, '0')}초`,
          { fontSize: '12px', color: '#5a4030' }).setOrigin(0.5);
      } else {
        this.add.text(cx, scoreY + 90,
          `이전 최고: ${prev.combineCount}회 / ${prevM}분 ${String(prevS).padStart(2, '0')}초`,
          { fontSize: '13px', color: '#5a4030' }).setOrigin(0.5);
      }
    }

    // PvP 점수
    if (!isSolo) {
      const myCol  = isWin ? '#d4af37' : '#c84040';
      const opCol  = isWin ? '#c84040' : '#d4af37';
      const myLabel = isWin ? '승리' : '패배';
      const opLabel = isWin ? '패배' : '승리';

      // 나
      this.add.rectangle(cx - 130, scoreY + 20, 200, 130, 0x231208).setStrokeStyle(1, accentColor);
      this.add.text(cx - 130, scoreY - 30, '나', { fontSize: '14px', color: '#8a7050' }).setOrigin(0.5);
      this.add.text(cx - 130, scoreY + 8, myLabel, { fontSize: '16px', color: myCol, fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(cx - 130, scoreY + 48, `${data.myScore}회`, {
        fontSize: '36px', color: myCol, fontStyle: 'bold',
        stroke: '#0a0603', strokeThickness: 3,
      }).setOrigin(0.5);

      // vs
      this.add.text(cx, scoreY + 20, 'VS', {
        fontSize: '20px', color: '#5a4030', fontStyle: 'bold',
      }).setOrigin(0.5);

      // 상대
      this.add.rectangle(cx + 130, scoreY + 20, 200, 130, 0x231208).setStrokeStyle(1, 0x5a3e1e);
      this.add.text(cx + 130, scoreY - 30, '상대', { fontSize: '14px', color: '#8a7050' }).setOrigin(0.5);
      this.add.text(cx + 130, scoreY + 8, opLabel, { fontSize: '16px', color: opCol, fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(cx + 130, scoreY + 48, `${data.opScore}회`, {
        fontSize: '36px', color: opCol, fontStyle: 'bold',
        stroke: '#0a0603', strokeThickness: 3,
      }).setOrigin(0.5);
    }

    // ── 하단 버튼 ────────────────────────────────────────────
    this.add.rectangle(cx, cy + 148, 560, 1, 0x5a3e1e);

    this._makeBtn(cx - 130, cy + 188, '↩  다시 하기', () => {
      this.scene.start('GameScene', { mode: data.mode, nickname: data.nickname });
    });
    this._makeBtn(cx + 130, cy + 188, '🏕  로비로',   () => {
      this.scene.start('LobbyScene');
    });
  }

  _makeBtn(x, y, label, cb) {
    const w = 220, h = 46;
    this.add.rectangle(x + 3, y + 3, w, h, 0x0a0603);
    const bg = this.add.rectangle(x, y, w, h, 0x3d2e1a)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xb87333);
    this.add.rectangle(x, y - Math.floor(h / 2) + 3, w - 6, 4, 0x5a4030, 0.5);
    const txt = this.add.text(x, y, label, {
      fontSize: '16px', color: '#e8c88a', fontStyle: 'bold',
    }).setOrigin(0.5);
    bg.on('pointerover', () => {
      bg.setFillStyle(0x5a3e20); bg.setStrokeStyle(2, 0xd4af37); txt.setColor('#d4af37');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x3d2e1a); bg.setStrokeStyle(2, 0xb87333); txt.setColor('#e8c88a');
    });
    bg.on('pointerdown', cb);
  }
}
