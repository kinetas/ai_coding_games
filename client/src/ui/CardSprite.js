import { CARD_META } from '../models/CardDefs.js';
import { StackBadge } from './StackBadge.js';

export const CARD_W = 90;
export const CARD_H = 120;

const CAT_COLOR = {
  human:    0xe8d5a8,
  nature:   0xbacf8a,
  threat:   0xc45040,
  resource: 0xd8c07a,
  weapon:   0xb09858,
  building: 0xc8a848,
  enemy:    0xa02020,
};

const CAT_BORDER = {
  human:    0x8b6530,
  nature:   0x5a7030,
  threat:   0x8b2010,
  resource: 0x8b6814,
  weapon:   0x7a5a18,
  building: 0x8b6800,
  enemy:    0x7a0000,
};

// 원형 아크 설정
const ARC_CX    = 0;
const ARC_CY    = -5;
const ARC_R     = 26;
const ARC_STEPS = 48;
const ARC_START = -Math.PI / 2;   // 12시 방향

export class CardSprite extends Phaser.GameObjects.Container {
  constructor(scene, stack) {
    super(scene, 0, 0);
    this.stack = stack;
    this._build();
    scene.add.existing(this);
  }

  _build() {
    const meta   = CARD_META[this.stack.type] || { label: '?', icon: '❓', category: 'resource' };
    const bgCol  = CAT_COLOR[meta.category]   || 0xd8c07a;
    const borCol = CAT_BORDER[meta.category]  || 0x8b6814;

    // 카드 그림자
    this.add(this.scene.add.rectangle(3, 4, CARD_W, CARD_H, 0x0a0603, 0.6));

    // 카드 본체
    this._bg = this.scene.add.rectangle(0, 0, CARD_W, CARD_H, bgCol)
      .setStrokeStyle(2, borCol);
    this.add(this._bg);

    // 상단 헤더 띠
    this.add(this.scene.add.rectangle(0, -CARD_H / 2 + 15, CARD_W, 30, 0x000000, 0.18));

    // 안쪽 장식 테두리
    const inner = this.scene.add.rectangle(0, 0, CARD_W - 8, CARD_H - 8, 0xffffff, 0);
    inner.setStrokeStyle(1, borCol, 0.3);
    this.add(inner);

    // 이모지 아이콘
    this.add(this.scene.add.text(0, -20, meta.icon, { fontSize: '30px' }).setOrigin(0.5));

    // 카드 이름
    this.add(this.scene.add.text(0, 24, meta.label, {
      fontSize: '12px', color: '#2a1400', fontStyle: 'bold',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5));

    // 수량 뱃지
    this._badge = new StackBadge(this.scene, -CARD_W / 2 + 14, -CARD_H / 2 + 14);
    this.add(this._badge);

    // 타이머 (위협/교전)
    this._timer = this.scene.add.text(0, CARD_H / 2 - 14, '',
      { fontSize: '11px', color: '#cc2200', fontStyle: 'bold' }).setOrigin(0.5);
    this.add(this._timer);

    // 교전 중 표시
    this._busyTxt = this.scene.add.text(0, 2, '',
      { fontSize: '10px', color: '#c84040', backgroundColor: '#1a0d05cc', padding: { x: 3, y: 1 } })
      .setOrigin(0.5);
    this.add(this._busyTxt);

    // ── 제작 원형 아크 오버레이 ──────────────────────────────
    this._craftGfx = this.scene.add.graphics();
    this.add(this._craftGfx);

    // 제작 카운트다운 숫자
    this._craftNum = this.scene.add.text(ARC_CX, ARC_CY, '', {
      fontSize: '20px', color: '#f5e6c8', fontStyle: 'bold',
      stroke: '#0a0603', strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false);
    this.add(this._craftNum);

    // 제작 완료 체크 ("✓")
    this._craftDone = this.scene.add.text(ARC_CX, ARC_CY, '', {
      fontSize: '22px', color: '#d4af37', fontStyle: 'bold',
      stroke: '#0a0603', strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false);
    this.add(this._craftDone);

    this.setSize(CARD_W, CARD_H).setInteractive();
  }

  refresh(timeNow) {
    this._badge.setCount(this.stack.count);

    if (this.stack.crafting && this.stack.craftEndAt && this.stack.craftStartAt) {
      // ── 제작 중: 원형 아크 카운트다운 ──────────────────────
      const total    = this.stack.craftEndAt - this.stack.craftStartAt;
      const elapsed  = timeNow - this.stack.craftStartAt;
      const progress = Math.min(1, Math.max(0, elapsed / total));
      const remaining = 1 - progress;                         // 남은 비율
      const secLeft  = Math.max(0, Math.ceil((this.stack.craftEndAt - timeNow) / 1000));

      const endA = ARC_START + remaining * Math.PI * 2;

      this._craftGfx.clear();

      // 전체 카드 어둡게
      this._craftGfx.fillStyle(0x000000, 0.60);
      this._craftGfx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);

      // 원형 트랙 (전체 링, 어두운 돌색)
      this._craftGfx.lineStyle(4, 0x2d1a08, 1);
      this._craftGfx.beginPath();
      this._craftGfx.arc(ARC_CX, ARC_CY, ARC_R, 0, Math.PI * 2, false, ARC_STEPS);
      this._craftGfx.strokePath();

      if (remaining > 0.002) {
        // 외곽 글로우 (amber, 낮은 투명도)
        this._craftGfx.lineStyle(10, 0xe8a430, 0.18);
        this._craftGfx.beginPath();
        this._craftGfx.arc(ARC_CX, ARC_CY, ARC_R + 1, ARC_START, endA, false, ARC_STEPS);
        this._craftGfx.strokePath();

        // 메인 아크 (amber, 시계 방향으로 줄어듦)
        this._craftGfx.lineStyle(6, 0xe8a430, 1);
        this._craftGfx.beginPath();
        this._craftGfx.arc(ARC_CX, ARC_CY, ARC_R, ARC_START, endA, false, ARC_STEPS);
        this._craftGfx.strokePath();

        // 12시 앵커 도트
        this._craftGfx.fillStyle(0xd4af37, 1);
        this._craftGfx.fillCircle(ARC_CX, ARC_CY - ARC_R, 5);

        // 이동 끝점 도트
        const tipX = ARC_CX + Math.cos(endA) * ARC_R;
        const tipY = ARC_CY + Math.sin(endA) * ARC_R;
        this._craftGfx.fillStyle(0xffe066, 1);
        this._craftGfx.fillCircle(tipX, tipY, 5);
      }

      // 초 숫자
      this._craftNum.setText(String(secLeft)).setVisible(secLeft > 0);
      this._craftDone.setVisible(false);

      this._timer.setText('');
      this._busyTxt.setText('');

    } else if (this.stack.crafting) {
      // 완료 직전 (crafting=true 이지만 시간 초과) → 잠깐 ✓ 표시
      this._craftGfx.clear();
      this._craftGfx.fillStyle(0x000000, 0.50);
      this._craftGfx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      this._craftGfx.lineStyle(4, 0xd4af37, 0.8);
      this._craftGfx.beginPath();
      this._craftGfx.arc(ARC_CX, ARC_CY, ARC_R, 0, Math.PI * 2, false, ARC_STEPS);
      this._craftGfx.strokePath();
      this._craftNum.setVisible(false);
      this._craftDone.setText('✓').setVisible(true);

    } else {
      // ── 평상시 ────────────────────────────────────────────
      this._craftGfx.clear();
      this._craftNum.setVisible(false);
      this._craftDone.setVisible(false);

      if (this.stack.expiresAt) {
        const sec = Math.max(0, Math.ceil((this.stack.expiresAt - timeNow) / 1000));
        this._timer.setText(`⏱${sec}s`).setColor(sec <= 5 ? '#ff0000' : '#cc2200');
      } else if (this.stack.combatTimer > 0 && this.stack.engagedWith) {
        const sec = Math.max(0, Math.ceil(this.stack.combatTimer / 1000));
        this._timer.setText(`⚔${sec}s`).setColor('#b87333');
      } else {
        this._timer.setText('');
      }

      this._busyTxt.setText(this.stack.busy ? '교전중' : '');
    }
  }

  setHighlight(on) {
    const meta   = CARD_META[this.stack.type];
    const borCol = CAT_BORDER[meta?.category] || 0x8b6814;
    this._bg.setStrokeStyle(on ? 3 : 2, on ? 0xd4af37 : borCol);
  }

  // 3초 홀드 후 병합 준비 상태 표시 (파란 테두리)
  setMergeHighlight(on) {
    const meta   = CARD_META[this.stack.type];
    const borCol = CAT_BORDER[meta?.category] || 0x8b6814;
    this._bg.setStrokeStyle(on ? 3 : 2, on ? 0x40a8ff : borCol);
  }

  setDragging(on) {
    this.setDepth(on ? 100 : 0);
    this.setScale(on ? 1.08 : 1.0);
    // crafting 상태면 refresh()가 alpha를 관리하므로 건드리지 않음
    if (!this.stack.crafting) this.setAlpha(on ? 0.82 : 1.0);
  }
}
