export class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }

  create(data) {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;

    const isWin  = data.result === 'WIN';
    const isSolo = data.mode === 'solo';

    // ── 배경: 다크 우드 테이블 ──────────────────────────────────
    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(0x070402, 1);
    bgGfx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 5) {
      bgGfx.fillStyle(0x2a1408, 0.01 + Math.abs(Math.sin(y * 0.14)) * 0.012);
      bgGfx.fillRect(0, y, W, 1);
    }
    bgGfx.fillStyle(0x000000, 0.38);
    bgGfx.fillRect(0, 0, 60, H); bgGfx.fillRect(W - 60, 0, 60, H);
    bgGfx.fillRect(0, 0, W, 48); bgGfx.fillRect(0, H - 48, W, 48);
    [[55, 62], [W - 55, 62], [55, H - 62], [W - 55, H - 62]].forEach(([gx, gy]) => {
      bgGfx.fillStyle(0xe05808, 0.04); bgGfx.fillCircle(gx, gy, 110);
      bgGfx.fillStyle(0xe07818, 0.07); bgGfx.fillCircle(gx, gy, 64);
      bgGfx.fillStyle(0xf09030, 0.12); bgGfx.fillCircle(gx, gy, 36);
      bgGfx.fillStyle(0xffe870, 0.22); bgGfx.fillCircle(gx, gy, 15);
      bgGfx.fillStyle(0xffffff, 0.30); bgGfx.fillCircle(gx, gy, 7);
    });
    bgGfx.fillStyle(0x180c04, 1);
    bgGfx.fillRect(0, 0, W, 14); bgGfx.fillRect(0, H - 14, W, 14);
    bgGfx.fillRect(0, 0, 14, H); bgGfx.fillRect(W - 14, 0, 14, H);
    bgGfx.fillStyle(0x8a5a28, 0.78);
    bgGfx.fillRect(0, 14, W, 2); bgGfx.fillRect(0, H - 16, W, 2);
    bgGfx.fillRect(14, 0, 2, H); bgGfx.fillRect(W - 16, 0, 2, H);
    bgGfx.fillStyle(0xc8960a, 0.42);
    for (let bx = 20; bx < W - 14; bx += 20) {
      bgGfx.fillRect(bx, 3, 10, 8); bgGfx.fillRect(bx, H - 11, 10, 8);
    }
    for (let by = 20; by < H - 14; by += 20) {
      bgGfx.fillRect(3, by, 8, 10); bgGfx.fillRect(W - 11, by, 8, 10);
    }
    bgGfx.fillStyle(0xc8960a, 0.92);
    [[0, 0], [W - 14, 0], [0, H - 14], [W - 14, H - 14]].forEach(([bx, by]) => bgGfx.fillRect(bx, by, 14, 14));
    bgGfx.fillStyle(0x070402, 1);
    [[4, 4], [W - 10, 4], [4, H - 10], [W - 10, H - 10]].forEach(([bx, by]) => bgGfx.fillRect(bx, by, 6, 6));

    this.add.text(55, 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);
    this.add.text(W - 55, 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);
    this.add.text(55, H - 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);
    this.add.text(W - 55, H - 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);

    // 승패 별 악센트 색상
    const accentColor = (!isSolo && isWin) ? 0xc8960a : (!isSolo && !isWin) ? 0x8b1208 : 0x8a5a28;
    // 측면 장식선
    this.add.rectangle(30, cy, 2, H * 0.7, accentColor, 0.5);
    this.add.rectangle(W - 30, cy, 2, H * 0.7, accentColor, 0.5);

    // 촛불 이모지 (승패별)
    const torchIcon = (!isSolo && isWin) ? '✨' : '🕯';
    this.add.text(55, cy - 60, torchIcon, { fontSize: '26px' }).setOrigin(0.5);
    this.add.text(W - 55, cy - 60, torchIcon, { fontSize: '26px' }).setOrigin(0.5);

    // ── 결과 타이틀 보드 ─────────────────────────────────────────
    const titleY = cy - 230;
    const titleBoardColor = (!isSolo && isWin) ? 0x1c1a04 : (!isSolo && !isWin) ? 0x160404 : 0x0e0905;

    this.add.rectangle(cx + 5, titleY + 5, 600, 90, 0x000000, 0.82);
    this.add.rectangle(cx, titleY, 600, 90, titleBoardColor).setStrokeStyle(2, accentColor);

    // 타이틀 보드 모서리 표식
    const tcGfx = this.add.graphics();
    tcGfx.fillStyle(accentColor, 0.8);
    [[cx - 296, titleY - 41], [cx + 290, titleY - 41],
     [cx - 296, titleY + 39], [cx + 290, titleY + 39]]
      .forEach(([px, py]) => tcGfx.fillRect(px, py, 6, 6));

    const title  = isSolo ? '전투 종료' : isWin ? '🏆  정복 성공!' : '💀  전선 붕괴';
    const tColor = (!isSolo && isWin) ? '#c8960a' : (!isSolo && !isWin) ? '#c03030' : '#c8960a';
    this.add.text(cx, titleY, title, {
      fontSize: '46px', color: tColor, fontStyle: 'bold',
      stroke: '#050302', strokeThickness: 5,
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // ── 점수 석판 ────────────────────────────────────────────────
    const scoreY = cy - 50;
    this.add.rectangle(cx + 4, scoreY + 4, 560, 240, 0x000000, 0.82);
    this.add.rectangle(cx, scoreY, 560, 240, 0x0f0905).setStrokeStyle(2, 0x8a5a28);

    this.add.rectangle(cx, scoreY - 120 + 22, 560, 44, 0x0a0704);
    this.add.rectangle(cx, scoreY - 120 + 44, 560, 1, 0x8a5a28, 0.6);
    this.add.text(cx, scoreY - 120 + 22, '— 전과 기록 —', {
      fontSize: '16px', color: '#6a4010', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // 점수판 모서리 표식
    const scGfx = this.add.graphics();
    scGfx.fillStyle(0xc8960a, 0.65);
    [[cx - 276, scoreY - 116], [cx + 270, scoreY - 116],
     [cx - 276, scoreY + 112], [cx + 270, scoreY + 112]]
      .forEach(([px, py]) => scGfx.fillRect(px, py, 6, 6));

    // 솔로 점수
    if (isSolo) {
      const t = data.survivalTime || 0;
      const m = Math.floor(t / 60), s = Math.floor(t % 60);
      this.add.text(cx, scoreY - 26, '조합 횟수', {
        fontSize: '14px', color: '#6a4010',
      }).setOrigin(0.5);
      this.add.text(cx, scoreY + 14, `${data.myScore}회`, {
        fontSize: '38px', color: '#e0c890', fontStyle: 'bold',
        stroke: '#050302', strokeThickness: 3,
      }).setOrigin(0.5);
      this.add.text(cx, scoreY + 58, `생존 시간: ${m}분 ${String(s).padStart(2, '0')}초`, {
        fontSize: '18px', color: '#8a5828', fontFamily: 'Georgia, serif',
      }).setOrigin(0.5);

      const prev  = data.prevBest || { combineCount: 0, survivalTime: 0 };
      const prevM = Math.floor(prev.survivalTime / 60);
      const prevS = Math.floor(prev.survivalTime % 60);

      if (data.isNewRecord) {
        this.add.text(cx, scoreY + 90, '⭐  신기록 달성!', {
          fontSize: '22px', color: '#c8960a', fontStyle: 'bold',
          stroke: '#050302', strokeThickness: 3,
        }).setOrigin(0.5);
        this.add.text(cx, scoreY + 115,
          `이전 최고: ${prev.combineCount}회 / ${prevM}분 ${String(prevS).padStart(2, '0')}초`,
          { fontSize: '12px', color: '#4a2c10' }).setOrigin(0.5);
      } else {
        this.add.text(cx, scoreY + 90,
          `이전 최고: ${prev.combineCount}회 / ${prevM}분 ${String(prevS).padStart(2, '0')}초`,
          { fontSize: '13px', color: '#4a2c10' }).setOrigin(0.5);
      }
    }

    // PvP 점수
    if (!isSolo) {
      const myCol  = isWin ? '#c8960a' : '#c03030';
      const opCol  = isWin ? '#c03030' : '#c8960a';
      const myLabel = isWin ? '승리' : '패배';
      const opLabel = isWin ? '패배' : '승리';

      this.add.rectangle(cx - 130, scoreY + 20, 200, 130, 0x0a0704).setStrokeStyle(1, accentColor);
      this.add.text(cx - 130, scoreY - 30, '나', { fontSize: '14px', color: '#6a4010' }).setOrigin(0.5);
      this.add.text(cx - 130, scoreY + 8, myLabel, { fontSize: '16px', color: myCol, fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(cx - 130, scoreY + 48, `${data.myScore}회`, {
        fontSize: '36px', color: myCol, fontStyle: 'bold',
        stroke: '#050302', strokeThickness: 3,
      }).setOrigin(0.5);

      this.add.text(cx, scoreY + 20, 'VS', {
        fontSize: '20px', color: '#3a1e08', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.rectangle(cx + 130, scoreY + 20, 200, 130, 0x0a0704).setStrokeStyle(1, 0x4a2c10);
      this.add.text(cx + 130, scoreY - 30, '상대', { fontSize: '14px', color: '#6a4010' }).setOrigin(0.5);
      this.add.text(cx + 130, scoreY + 8, opLabel, { fontSize: '16px', color: opCol, fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(cx + 130, scoreY + 48, `${data.opScore}회`, {
        fontSize: '36px', color: opCol, fontStyle: 'bold',
        stroke: '#050302', strokeThickness: 3,
      }).setOrigin(0.5);
    }

    // ── 하단 버튼 ────────────────────────────────────────────────
    this.add.rectangle(cx, cy + 148, 560, 1, 0x3a1e08);

    this._makeBtn(cx - 130, cy + 188, '↩  다시 하기', () => {
      this.scene.start('GameScene', { mode: data.mode, nickname: data.nickname });
    });
    this._makeBtn(cx + 130, cy + 188, '🏕  로비로', () => {
      this.scene.start('LobbyScene');
    });
  }

  _makeBtn(x, y, label, cb) {
    const w = 220, h = 46;
    this.add.rectangle(x + 4, y + 4, w, h, 0x000000, 0.78);
    const bg = this.add.rectangle(x, y, w, h, 0x140a04)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x8a5a28);
    this.add.rectangle(x, y - Math.floor(h / 2) + 4, w - 8, 2, 0x2a1608, 0.5);
    const txt = this.add.text(x, y, label, {
      fontSize: '16px', color: '#d4b870', fontStyle: 'bold',
    }).setOrigin(0.5);
    bg.on('pointerover', () => { bg.setFillStyle(0x201408); bg.setStrokeStyle(2, 0xc8960a); txt.setColor('#e8d090'); });
    bg.on('pointerout',  () => { bg.setFillStyle(0x140a04); bg.setStrokeStyle(2, 0x8a5a28); txt.setColor('#d4b870'); });
    bg.on('pointerdown', cb);
  }
}
