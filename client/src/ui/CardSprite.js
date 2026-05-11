import { CARD_META } from '../models/CardDefs.js';
import { StackBadge } from './StackBadge.js';

export const CARD_W = 90;
export const CARD_H = 120;

const CAT_COLOR = {
  human:    0xdff0ff,
  nature:   0xeeffdd,
  threat:   0xffdddd,
  resource: 0xfff9f0,
  weapon:   0xf0e8ff,
  building: 0xfff5cc,
  enemy:    0xffcccc,
};

export class CardSprite extends Phaser.GameObjects.Container {
  constructor(scene, stack) {
    super(scene, 0, 0);
    this.stack = stack;
    this._build();
    scene.add.existing(this);
  }

  _build() {
    const meta  = CARD_META[this.stack.type] || { label: '?', icon: '❓', category: 'resource' };
    const bgCol = CAT_COLOR[meta.category] || 0xfff9f0;

    this._bg = this.scene.add.rectangle(0, 0, CARD_W, CARD_H, bgCol)
      .setStrokeStyle(2, 0x8b6914);
    this.add(this._bg);

    this.add(this.scene.add.text(0, -20, meta.icon,
      { fontSize: '32px' }).setOrigin(0.5));
    this.add(this.scene.add.text(0, 22, meta.label,
      { fontSize: '13px', color: '#3a2200', fontStyle: 'bold' }).setOrigin(0.5));

    this._badge = new StackBadge(this.scene, CARD_W / 2 - 14, -CARD_H / 2 + 14);
    this.add(this._badge);

    this._timer = this.scene.add.text(0, CARD_H / 2 - 14, '',
      { fontSize: '11px', color: '#cc2200', fontStyle: 'bold' }).setOrigin(0.5);
    this.add(this._timer);

    this._busyTxt = this.scene.add.text(0, 0, '',
      { fontSize: '10px', color: '#ff6600', backgroundColor: '#000000aa', padding: { x: 2, y: 1 } })
      .setOrigin(0.5);
    this.add(this._busyTxt);

    this._craftBar = this.scene.add.graphics();
    this.add(this._craftBar);

    this._craftLabel = this.scene.add.text(0, CARD_H / 2 - 22, '',
      { fontSize: '11px', color: '#3366ff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add(this._craftLabel);

    this.setSize(CARD_W, CARD_H).setInteractive();
  }

  refresh(timeNow) {
    this._badge.setCount(this.stack.count);

    if (this.stack.crafting && this.stack.craftEndAt && this.stack.craftStartAt) {
      const total    = this.stack.craftEndAt - this.stack.craftStartAt;
      const elapsed  = timeNow - this.stack.craftStartAt;
      const progress = Math.min(1, elapsed / total);

      const bw = CARD_W - 10, bh = 6;
      const bx = -bw / 2, by = CARD_H / 2 - 18;
      this._craftBar.clear();
      this._craftBar.fillStyle(0x222222, 0.6);
      this._craftBar.fillRect(bx, by, bw, bh);
      this._craftBar.fillStyle(0x4488ff, 1);
      this._craftBar.fillRect(bx, by, bw * progress, bh);

      const sec = Math.max(0, Math.ceil((this.stack.craftEndAt - timeNow) / 1000));
      this._craftLabel.setText(`⚒ ${sec}s`).setVisible(true);
      this._timer.setText('');
      this.setAlpha(0.75);
    } else {
      this._craftBar.clear();
      this._craftLabel.setVisible(false);
      this.setAlpha(1.0);

      if (this.stack.expiresAt) {
        const sec = Math.max(0, Math.ceil((this.stack.expiresAt - timeNow) / 1000));
        this._timer.setText(`⏱${sec}s`).setColor(sec <= 5 ? '#ff0000' : '#cc2200');
      } else if (this.stack.combatTimer > 0 && this.stack.engagedWith) {
        const sec = Math.max(0, Math.ceil(this.stack.combatTimer / 1000));
        this._timer.setText(`⚔️${sec}s`).setColor('#ff6600');
      } else {
        this._timer.setText('');
      }
    }

    this._busyTxt.setText(this.stack.busy ? '교전중' : '');
  }

  setHighlight(on) {
    this._bg.setStrokeStyle(on ? 3 : 2, on ? 0xffe066 : 0x8b6914);
  }

  setDragging(on) {
    this.setAlpha(on ? 0.7 : 1.0);
    this.setDepth(on ? 100 : 0);
  }
}
