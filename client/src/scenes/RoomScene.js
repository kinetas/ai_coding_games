export class RoomScene extends Phaser.Scene {
  constructor() { super('RoomScene'); }

  create(data) {
    this._nick = data.nickname;
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;

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

    // ── 중앙 목재 패널 ───────────────────────────────────────────
    const panW = 540, panH = 440, panY = cy + 20;

    this.add.rectangle(cx + 5, panY + 5, panW, panH, 0x000000, 0.82);
    this.add.rectangle(cx, panY, panW, panH, 0x0f0905).setStrokeStyle(2, 0x8a5a28);

    // 패널 헤더
    const hH = 56;
    this.add.rectangle(cx, panY - panH / 2 + hH / 2, panW, hH, 0x0a0704);
    this.add.rectangle(cx, panY - panH / 2 + hH, panW, 1, 0x8a5a28, 0.85);
    this.add.rectangle(cx, panY - panH / 2 + hH + 1, panW, 1, 0xc8960a, 0.2);

    // 패널 모서리 표식
    const pGfx = this.add.graphics();
    pGfx.fillStyle(0xc8960a, 0.72);
    [[cx - panW / 2 + 4, panY - panH / 2 + 4], [cx + panW / 2 - 10, panY - panH / 2 + 4],
     [cx - panW / 2 + 4, panY + panH / 2 - 10], [cx + panW / 2 - 10, panY + panH / 2 - 10]]
      .forEach(([px, py]) => pGfx.fillRect(px, py, 6, 6));

    this.add.text(cx, panY - panH / 2 + hH / 2, '⚔  다인 전장  ⚔', {
      fontSize: '26px', color: '#c8960a', fontStyle: 'bold',
      stroke: '#050302', strokeThickness: 3, fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this.add.text(cx, panY - panH / 2 + hH + 24, `닉네임: ${this._nick}`, {
      fontSize: '15px', color: '#8a5828', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // ── 버튼 ─────────────────────────────────────────────────────
    this._makeBtn(cx, panY - panH / 2 + hH + 80, '🏕  방 만들기',  () => this._createRoom(), 260, 50);
    this._makeBtn(cx, panY - panH / 2 + hH + 150, '🚪  방 참여하기', () => this._joinRoom(),   260, 50);

    // 방 코드 입력
    this.add.text(cx, panY - panH / 2 + hH + 212, '방 코드 입력', {
      fontSize: '13px', color: '#6a4010',
    }).setOrigin(0.5);

    this._codeInput = this.add.dom(cx, panY - panH / 2 + hH + 248).createFromHTML(
      '<input id="roomcode" type="text" placeholder="방 코드 6자리" maxlength="8" ' +
      'style="font-size:16px;padding:10px;width:200px;text-align:center;' +
      'border-radius:1px;border:1px solid #4a2c10;border-bottom:2px solid #8a5a28;' +
      'background:#0c0804;color:#e0c890;outline:none;' +
      'font-family:Georgia,serif;letter-spacing:2px;text-transform:uppercase;">'
    );

    this._errorText = this.add.text(cx, panY - panH / 2 + hH + 290, '', {
      fontSize: '13px', color: '#a01808',
    }).setOrigin(0.5);

    this.add.rectangle(cx, panY + panH / 2 - 58, panW - 40, 1, 0x3a1e08);
    this._makeBtn(cx, panY + panH / 2 - 30, '← 뒤로', () => this.scene.start('LobbyScene'), 160, 38);
  }

  _makeBtn(x, y, label, cb, w = 260, h = 46) {
    this.add.rectangle(x + 3, y + 3, w, h, 0x000000, 0.78);
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
    return { bg, txt };
  }

  _createRoom() {
    this.scene.start('WaitingScene', { nickname: this._nick, action: 'create' });
  }

  _joinRoom() {
    const code = document.getElementById('roomcode')?.value.trim().toUpperCase();
    if (!code || code.length < 4) {
      this._errorText.setText('방 코드를 입력해주세요');
      return;
    }
    this.scene.start('WaitingScene', { nickname: this._nick, action: 'join', code });
  }
}
