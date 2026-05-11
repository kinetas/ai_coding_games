export class RoomScene extends Phaser.Scene {
  constructor() { super('RoomScene'); }

  create(data) {
    this._nick = data.nickname;
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;

    // ── 배경 ─────────────────────────────────────────────────
    this.add.rectangle(cx, cy, W, H, 0x1a0d05);
    for (let x = 160; x < W; x += 160) this.add.rectangle(x, cy, 1, H, 0xffffff, 0.04);
    for (let y = 60; y < H; y += 60)  this.add.rectangle(cx, y, W, 1, 0xffffff, 0.04);

    this.add.rectangle(cx, 22, W, 44, 0x231208);
    this.add.rectangle(cx, 44, W, 2, 0xb87333, 0.6);
    this.add.rectangle(cx, H - 22, W, 44, 0x231208);
    this.add.rectangle(cx, H - 44, W, 2, 0xb87333, 0.4);

    // 좌우 횃불
    this.add.text(50, cy - 40, '🔥', { fontSize: '28px' }).setOrigin(0.5);
    this.add.text(W - 50, cy - 40, '🔥', { fontSize: '28px' }).setOrigin(0.5);

    // ── 중앙 석판 패널 ──────────────────────────────────────
    const panW = 540, panH = 440;
    this.add.rectangle(cx + 4, cy + 4 + 20, panW, panH, 0x0a0603);
    this.add.rectangle(cx, cy + 20, panW, panH, 0x1e1005).setStrokeStyle(2, 0xb87333);

    // 패널 상단 헤더
    this.add.rectangle(cx, cy + 20 - panH / 2 + 28, panW, 56, 0x2d1a08);
    this.add.rectangle(cx, cy + 20 - panH / 2 + 56, panW, 2, 0xb87333, 0.6);

    this.add.text(cx, cy + 20 - panH / 2 + 28, '⚔  다인 전장  ⚔', {
      fontSize: '26px', color: '#d4af37', fontStyle: 'bold',
      stroke: '#4a2200', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(cx, cy + 20 - panH / 2 + 80, `닉네임: ${this._nick}`, {
      fontSize: '15px', color: '#b87333', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // ── 버튼 ─────────────────────────────────────────────────
    this._makeBtn(cx, cy + 20 - panH / 2 + 140, '🏕  방 만들기', () => this._createRoom(), 260, 50);
    this._makeBtn(cx, cy + 20 - panH / 2 + 210, '🚪  방 참여하기', () => this._joinRoom(), 260, 50);

    // 방 코드 입력
    this.add.text(cx, cy + 20 - panH / 2 + 272, '방 코드 입력', {
      fontSize: '13px', color: '#8a7050',
    }).setOrigin(0.5);

    this._codeInput = this.add.dom(cx, cy + 20 - panH / 2 + 308).createFromHTML(
      '<input id="roomcode" type="text" placeholder="방 코드 6자리" maxlength="8" ' +
      'style="font-size:16px;padding:10px;width:200px;text-align:center;' +
      'border-radius:2px;border:2px solid #b87333;' +
      'background:#1a0d05;color:#f5e6c8;outline:none;' +
      'font-family:Georgia,serif;letter-spacing:2px;text-transform:uppercase;">'
    );

    this._errorText = this.add.text(cx, cy + 20 - panH / 2 + 352, '', {
      fontSize: '13px', color: '#c84040',
    }).setOrigin(0.5);

    // 구분선
    this.add.rectangle(cx, cy + 20 + panH / 2 - 58, panW - 40, 1, 0x5a3e1e);

    this._makeBtn(cx, cy + 20 + panH / 2 - 30, '← 뒤로', () => this.scene.start('LobbyScene'), 160, 38);
  }

  _makeBtn(x, y, label, cb, w = 260, h = 46) {
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
