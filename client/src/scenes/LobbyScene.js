export class LobbyScene extends Phaser.Scene {
  constructor() { super('LobbyScene'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2, cy = H / 2;

    // 배경
    this.add.rectangle(cx, cy, W, H, 0x1a3a1a);

    this.add.text(cx, cy - 160, 'CardForge Online',
      { fontSize: '40px', color: '#f5c842', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cx, cy - 110, '중세 카드 경영 & 전략 서바이벌',
      { fontSize: '16px', color: '#aaddaa' }).setOrigin(0.5);

    // 닉네임 입력 (DOM)
    this._nickInput = this.add.dom(cx, cy - 50).createFromHTML(
      '<input id="nick" type="text" placeholder="닉네임 입력 (최대 12자)" maxlength="12" ' +
      'style="font-size:18px;padding:8px 12px;width:220px;text-align:center;border-radius:6px;border:2px solid #f5c842;background:#1a2a1a;color:#fff;outline:none;">'
    );

    this._makeBtn(cx - 100, cy + 30, 'Solo Play',  0x3a7d44, () => this._startSolo());
    this._makeBtn(cx + 100, cy + 30, 'Multi Play', 0x2a5cb8, () => this._goMulti());
    this._makeBtn(cx - 100, cy + 95, 'Setting',    0x555555, () => {});
    this._makeBtn(cx + 100, cy + 95, 'Tutorial',   0x886600, () => this._showTutorial());

    // 버전 표시
    this.add.text(W - 10, H - 10, 'v1.0', { fontSize: '11px', color: '#555' }).setOrigin(1, 1);
  }

  _makeBtn(x, y, label, color, cb) {
    const bg  = this.add.rectangle(x, y, 170, 46, color).setInteractive().setStrokeStyle(1, 0xffffff, 0.3);
    const txt = this.add.text(x, y, label, { fontSize: '17px', color: '#ffffff' }).setOrigin(0.5);
    bg.on('pointerover',  () => bg.setFillStyle(Phaser.Display.Color.ValueToColor(color).lighten(20).color));
    bg.on('pointerout',   () => bg.setFillStyle(color));
    bg.on('pointerdown',  cb);
    return { bg, txt };
  }

  _getNick() {
    const el = document.getElementById('nick');
    return el?.value.trim() || '모험가';
  }

  _startSolo() {
    const nick = this._getNick();
    this.scene.start('GameScene', { mode: 'solo', nickname: nick });
  }

  _goMulti() {
    const nick = this._getNick();
    this.scene.start('RoomScene', { nickname: nick });
  }

  _showTutorial() {
    const W = this.scale.width, H = this.scale.height;
    const panel = this.add.rectangle(W / 2, H / 2, W - 60, H - 80, 0x0a1a0a, 0.97)
      .setStrokeStyle(2, 0xf5c842).setDepth(50);
    const lines = [
      '== CardForge 기본 규칙 ==',
      '',
      '● 카드를 다른 카드 위에 드래그하면 조합이 됩니다.',
      '● 1초 길게 누르면 1장만 분리하여 드래그합니다.',
      '● 숫자키 1~9 + 드래그로 여러 장 분리합니다.',
      '',
      '● 바위+사람 → 돌 2장 (사람 유지)',
      '● 나무+사람 → 목재 2장',
      '● 농지+사람 → 식량 1장',
      '● 돌+돌 → 벽돌 | 식량+식량 → 씨앗',
      '● 목재+돌 → 창 | 창+목재 → 활 | 목재+목재 → 배',
      '● 사람+창 → 전사 | 활+사람 → 궁수',
      '● 벽돌+벽돌 → 성벽 | 벽돌+나무 → 목조 가옥',
      '',
      '● 인구가 0이 되면 패배!',
      '● 솔로: 최대한 오래 생존하세요.',
      '',
      '[ 클릭하여 닫기 ]',
    ];
    const txt = this.add.text(W / 2, H / 2, lines.join('\n'),
      { fontSize: '14px', color: '#ccffcc', lineSpacing: 6, align: 'left' })
      .setOrigin(0.5).setDepth(51);
    panel.setInteractive();
    panel.on('pointerdown', () => { panel.destroy(); txt.destroy(); });
  }
}
