export class RoomScene extends Phaser.Scene {
  constructor() { super('RoomScene'); }

  create(data) {
    this._nick = data.nickname;
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;

    this.add.rectangle(cx, cy, W, H, 0x1a1a3a);
    this.add.text(cx, cy - 160, 'Multi Play',
      { fontSize: '34px', color: '#f5c842', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cx, cy - 115, `닉네임: ${this._nick}`,
      { fontSize: '16px', color: '#aaaaff' }).setOrigin(0.5);

    this._makeBtn(cx, cy - 60, '🏠 방 만들기',   0x3a7d44, () => this._createRoom());
    this._makeBtn(cx, cy + 10, '🚪 방 참여하기', 0x2a5cb8, () => this._joinRoom());

    // 방 코드 입력 (참여용)
    this._codeInput = this.add.dom(cx, cy + 80).createFromHTML(
      '<input id="roomcode" type="text" placeholder="방 코드 입력 (6자리)" maxlength="8" ' +
      'style="font-size:16px;padding:8px;width:180px;text-align:center;border-radius:6px;border:2px solid #2a5cb8;background:#1a1a2a;color:#fff;outline:none;text-transform:uppercase;">'
    );

    this._errorText = this.add.text(cx, cy + 130, '', { fontSize: '14px', color: '#ff4444' }).setOrigin(0.5);

    this._makeBtn(cx, cy + 175, '← 뒤로가기', 0x444444, () => this.scene.start('LobbyScene'));
  }

  _makeBtn(x, y, label, color, cb) {
    const bg  = this.add.rectangle(x, y, 200, 46, color).setInteractive().setStrokeStyle(1, 0xffffff, 0.3);
    const txt = this.add.text(x, y, label, { fontSize: '17px', color: '#fff' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setAlpha(0.8));
    bg.on('pointerout',  () => bg.setAlpha(1));
    bg.on('pointerdown', cb);
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
