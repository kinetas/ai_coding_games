import { CARD_META } from '../models/CardDefs.js';
import { StackBadge } from './StackBadge.js';

export const CARD_W = 90;
export const CARD_H = 120;

// 원시 부족 팔레트 — 가독성 유지하면서 어두운 흙빛으로
const CAT_COLOR = {
  human:    0xc8a870,  // 무두질한 가죽
  nature:   0x5a7a30,  // 짙은 이끼
  threat:   0x7a2010,  // 녹슨 피
  resource: 0xb89040,  // 황토 점토
  weapon:   0x6a5030,  // 어두운 부싯돌
  building: 0x7a5020,  // 점토 벽돌
  enemy:    0x6a0c0c,  // 짙은 진홍
};

const CAT_BORDER = {
  human:    0x8a5828,
  nature:   0x344818,
  threat:   0x501008,
  resource: 0x7a5018,
  weapon:   0x483018,
  building: 0x503010,
  enemy:    0x440808,
};

const ARC_CX    = 0;
const ARC_CY    = -5;
const ARC_R     = 26;
const ARC_STEPS = 48;
const ARC_START = -Math.PI / 2;

export class CardSprite extends Phaser.GameObjects.Container {
  constructor(scene, stack) {
    super(scene, 0, 0);
    this.stack = stack;
    this._build();
    scene.add.existing(this);
  }

  _build() {
    const meta   = CARD_META[this.stack.type] || { label: '?', icon: '❓', category: 'resource' };
    const bgCol  = CAT_COLOR[meta.category]   || 0xb89040;
    const borCol = CAT_BORDER[meta.category]  || 0x7a5018;

    // 드라마틱한 그림자
    this.add(this.scene.add.rectangle(4, 6, CARD_W, CARD_H, 0x000000, 0.78));

    // 카드 본체
    this._bg = this.scene.add.rectangle(0, 0, CARD_W, CARD_H, bgCol)
      .setStrokeStyle(2, borCol);
    this.add(this._bg);

    // 양피지/가죽 결 텍스처 (수평선)
    const grainGfx = this.scene.add.graphics();
    grainGfx.lineStyle(1, 0x000000, 0.07);
    for (let gy = -CARD_H / 2 + 38; gy < CARD_H / 2 - 14; gy += 11) {
      grainGfx.lineBetween(-CARD_W / 2 + 7, gy, CARD_W / 2 - 7, gy);
    }
    this.add(grainGfx);

    // 상단 헤더 띠 (그을린 느낌)
    this.add(this.scene.add.rectangle(0, -CARD_H / 2 + 15, CARD_W, 30, 0x000000, 0.28));

    // 헤더 부족 대시 패턴
    const headerGfx = this.scene.add.graphics();
    headerGfx.fillStyle(borCol, 0.22);
    for (let hx = -CARD_W / 2 + 8; hx < CARD_W / 2 - 6; hx += 10) {
      headerGfx.fillRect(hx, -CARD_H / 2 + 5, 6, 2);
    }
    this.add(headerGfx);

    // 안쪽 테두리 (부족 느낌)
    const innerGfx = this.scene.add.graphics();
    innerGfx.lineStyle(1, borCol, 0.4);
    innerGfx.strokeRect(-CARD_W / 2 + 5, -CARD_H / 2 + 5, CARD_W - 10, CARD_H - 10);
    this.add(innerGfx);

    // 부족 모서리 L-표식
    const cornerGfx = this.scene.add.graphics();
    cornerGfx.fillStyle(borCol, 0.65);
    const L = 9, t = 2;
    // 좌상
    cornerGfx.fillRect(-CARD_W/2 + 5, -CARD_H/2 + 5, L, t);
    cornerGfx.fillRect(-CARD_W/2 + 5, -CARD_H/2 + 5, t, L);
    // 우상
    cornerGfx.fillRect(CARD_W/2 - 5 - L, -CARD_H/2 + 5, L, t);
    cornerGfx.fillRect(CARD_W/2 - 5 - t, -CARD_H/2 + 5, t, L);
    // 좌하
    cornerGfx.fillRect(-CARD_W/2 + 5, CARD_H/2 - 5 - t, L, t);
    cornerGfx.fillRect(-CARD_W/2 + 5, CARD_H/2 - 5 - L, t, L);
    // 우하
    cornerGfx.fillRect(CARD_W/2 - 5 - L, CARD_H/2 - 5 - t, L, t);
    cornerGfx.fillRect(CARD_W/2 - 5 - t, CARD_H/2 - 5 - L, t, L);
    this.add(cornerGfx);

    // SVG 아이콘 (없으면 텍스트 이모지 폴백)
    const iconKey = `icon_${this.stack.type.toLowerCase()}`;
    if (this.scene.textures.exists(iconKey)) {
      this.add(this.scene.add.image(0, -16, iconKey).setDisplaySize(44, 44));
    } else {
      this.add(this.scene.add.text(0, -20, meta.icon, { fontSize: '30px' }).setOrigin(0.5));
    }

    // 이름
    this.add(this.scene.add.text(0, 26, meta.label, {
      fontSize: '11px', color: '#2a1008', fontStyle: 'bold',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5));

    // 수량 뱃지
    this._badge = new StackBadge(this.scene, -CARD_W / 2 + 14, -CARD_H / 2 + 14);
    this.add(this._badge);

    // 타이머
    this._timer = this.scene.add.text(0, CARD_H / 2 - 14, '',
      { fontSize: '11px', color: '#c01808', fontStyle: 'bold' }).setOrigin(0.5);
    this.add(this._timer);

    // 교전중 표시
    this._busyTxt = this.scene.add.text(0, 2, '',
      { fontSize: '10px', color: '#c04030', backgroundColor: '#0c0603cc', padding: { x: 3, y: 1 } })
      .setOrigin(0.5);
    this.add(this._busyTxt);

    // 제작 원형 아크
    this._craftGfx = this.scene.add.graphics();
    this.add(this._craftGfx);

    this._craftNum = this.scene.add.text(ARC_CX, ARC_CY, '', {
      fontSize: '20px', color: '#e8d4a0', fontStyle: 'bold',
      stroke: '#070402', strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false);
    this.add(this._craftNum);

    this._craftDone = this.scene.add.text(ARC_CX, ARC_CY, '', {
      fontSize: '22px', color: '#c8960a', fontStyle: 'bold',
      stroke: '#070402', strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false);
    this.add(this._craftDone);

    this.setSize(CARD_W, CARD_H).setInteractive();
  }

  refresh(timeNow) {
    this._badge.setCount(this.stack.count);

    if (this.stack.crafting && this.stack.craftEndAt && this.stack.craftStartAt) {
      const total    = this.stack.craftEndAt - this.stack.craftStartAt;
      const elapsed  = timeNow - this.stack.craftStartAt;
      const progress = Math.min(1, Math.max(0, elapsed / total));
      const remaining = 1 - progress;
      const secLeft  = Math.max(0, Math.ceil((this.stack.craftEndAt - timeNow) / 1000));
      const endA     = ARC_START + remaining * Math.PI * 2;

      this._craftGfx.clear();
      this._craftGfx.fillStyle(0x000000, 0.65);
      this._craftGfx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);

      this._craftGfx.lineStyle(4, 0x1e0e04, 1);
      this._craftGfx.beginPath();
      this._craftGfx.arc(ARC_CX, ARC_CY, ARC_R, 0, Math.PI * 2, false, ARC_STEPS);
      this._craftGfx.strokePath();

      if (remaining > 0.002) {
        this._craftGfx.lineStyle(10, 0xc8960a, 0.15);
        this._craftGfx.beginPath();
        this._craftGfx.arc(ARC_CX, ARC_CY, ARC_R + 1, ARC_START, endA, false, ARC_STEPS);
        this._craftGfx.strokePath();

        this._craftGfx.lineStyle(6, 0xc8960a, 1);
        this._craftGfx.beginPath();
        this._craftGfx.arc(ARC_CX, ARC_CY, ARC_R, ARC_START, endA, false, ARC_STEPS);
        this._craftGfx.strokePath();

        this._craftGfx.fillStyle(0xc8960a, 1);
        this._craftGfx.fillCircle(ARC_CX, ARC_CY - ARC_R, 4);

        const tipX = ARC_CX + Math.cos(endA) * ARC_R;
        const tipY = ARC_CY + Math.sin(endA) * ARC_R;
        this._craftGfx.fillStyle(0xe8d070, 1);
        this._craftGfx.fillCircle(tipX, tipY, 5);
      }

      this._craftNum.setText(String(secLeft)).setVisible(secLeft > 0);
      this._craftDone.setVisible(false);
      this._timer.setText('');
      this._busyTxt.setText('');

    } else if (this.stack.crafting) {
      this._craftGfx.clear();
      this._craftGfx.fillStyle(0x000000, 0.55);
      this._craftGfx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      this._craftGfx.lineStyle(4, 0xc8960a, 0.85);
      this._craftGfx.beginPath();
      this._craftGfx.arc(ARC_CX, ARC_CY, ARC_R, 0, Math.PI * 2, false, ARC_STEPS);
      this._craftGfx.strokePath();
      this._craftNum.setVisible(false);
      this._craftDone.setText('✓').setVisible(true);

    } else {
      this._craftGfx.clear();
      this._craftNum.setVisible(false);
      this._craftDone.setVisible(false);

      if (this.stack.expiresAt) {
        const sec = Math.max(0, Math.ceil((this.stack.expiresAt - timeNow) / 1000));
        this._timer.setText(`⏱${sec}s`).setColor(sec <= 5 ? '#ff2020' : '#c01808');
      } else if (this.stack.combatTimer > 0 && this.stack.engagedWith) {
        const sec = Math.max(0, Math.ceil(this.stack.combatTimer / 1000));
        this._timer.setText(`⚔${sec}s`).setColor('#a06030');
      } else {
        this._timer.setText('');
      }

      this._busyTxt.setText(this.stack.busy ? '교전중' : '');
    }
  }

  setHighlight(on) {
    const meta   = CARD_META[this.stack.type];
    const borCol = CAT_BORDER[meta?.category] || 0x7a5018;
    this._bg.setStrokeStyle(on ? 3 : 2, on ? 0xc8960a : borCol);
  }

  setMergeHighlight(on) {
    const meta   = CARD_META[this.stack.type];
    const borCol = CAT_BORDER[meta?.category] || 0x7a5018;
    this._bg.setStrokeStyle(on ? 3 : 2, on ? 0x4090d0 : borCol);
  }

  setDragging(on) {
    this.setDepth(on ? 100 : 0);
    this.setScale(on ? 1.08 : 1.0);
    if (!this.stack.crafting) this.setAlpha(on ? 0.85 : 1.0);
  }
}
