export class StackBadge extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this._circle = scene.add.circle(0, 0, 12, 0xcc3300);
    this._text   = scene.add.text(0, 0, '',
      { fontSize: '11px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add([this._circle, this._text]);
    scene.add.existing(this);
    this.setVisible(false);
  }

  setCount(n) {
    if (n <= 1) { this.setVisible(false); return; }
    this._text.setText(String(n));
    this.setVisible(true);
  }
}
