export class StackBadge extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    // 청동빛 원형 뱃지
    this._bg     = scene.add.circle(0, 0, 13, 0x2d1a08);
    this._border = scene.add.circle(0, 0, 13, 0x00000000).setStrokeStyle(1.5, 0xb87333);
    this._text   = scene.add.text(0, 0, '',
      { fontSize: '11px', color: '#d4af37', fontStyle: 'bold' }).setOrigin(0.5);
    this.add([this._bg, this._border, this._text]);
    scene.add.existing(this);
    this.setVisible(false);
  }

  setCount(n) {
    if (n <= 1) { this.setVisible(false); return; }
    this._text.setText(String(n));
    this.setVisible(true);
  }
}
