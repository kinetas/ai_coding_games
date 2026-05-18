export class StackBadge extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this._bg     = scene.add.circle(0, 0, 13, 0x1a0c06);
    this._border = scene.add.circle(0, 0, 13, 0x00000000).setStrokeStyle(1.5, 0x8a5a28);
    this._text   = scene.add.text(0, 0, '',
      { fontSize: '11px', color: '#e0c890', fontStyle: 'bold' }).setOrigin(0.5);
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
