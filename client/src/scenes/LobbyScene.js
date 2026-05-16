import { SoundManager } from '../ui/SoundManager.js';

export class LobbyScene extends Phaser.Scene {
  constructor() { super('LobbyScene'); }

  create() {
    SoundManager.get().playLobbyBGM();
    const W = this.scale.width;
    const _audioReady = SoundManager.get().isRunning(); // 게임에서 돌아온 경우 true
    const H = this.scale.height;
    const cx = W / 2, cy = H / 2;

    // ── 배경: 어두운 흙빛 돌벽 ──────────────────────────────
    this.add.rectangle(cx, cy, W, H, 0x1a0d05);

    // 돌 블록 세로 줄눈
    for (let x = 160; x < W; x += 160) {
      this.add.rectangle(x, cy, 1, H, 0xffffff, 0.04);
    }
    // 돌 블록 가로 줄눈
    for (let y = 60; y < H; y += 60) {
      this.add.rectangle(cx, y, W, 1, 0xffffff, 0.04);
    }

    // 상단/하단 석조 테두리
    this.add.rectangle(cx, 22, W, 44, 0x231208);
    this.add.rectangle(cx, 44, W, 2, 0xb87333, 0.6);
    this.add.rectangle(cx, H - 22, W, 44, 0x231208);
    this.add.rectangle(cx, H - 44, W, 2, 0xb87333, 0.4);

    // 좌우 그늘
    this.add.rectangle(18, cy, 36, H, 0x0a0603);
    this.add.rectangle(W - 18, cy, 36, H, 0x0a0603);
    this.add.rectangle(36, cy, 2, H, 0xb87333, 0.3);
    this.add.rectangle(W - 36, cy, 2, H, 0xb87333, 0.3);

    // 횃불
    this.add.text(36, cy - 60, '🔥', { fontSize: '30px' }).setOrigin(0.5);
    this.add.text(W - 36, cy - 60, '🔥', { fontSize: '30px' }).setOrigin(0.5);

    // ── 타이틀 석판 ─────────────────────────────────────────
    const tabW = 560, tabH = 110, tabY = cy - 165;
    this.add.rectangle(cx + 4, tabY + 4, tabW, tabH, 0x0a0603);   // 그림자
    this.add.rectangle(cx, tabY, tabW, tabH, 0x231208).setStrokeStyle(2, 0xb87333);

    // 석판 모서리 장식
    const hw = tabW / 2 - 6, hh = tabH / 2 - 6;
    for (const [sx, sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
      this.add.rectangle(cx + sx * hw, tabY + sy * hh, 10, 10, 0xd4af37);
    }

    // 타이틀
    this.add.text(cx, tabY - 18, '⚒  CardForge Online  ⚒', {
      fontSize: '34px', color: '#d4af37', fontStyle: 'bold',
      stroke: '#4a2200', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(cx, tabY + 24, '원시 카드 경영 & 전략 서바이벌', {
      fontSize: '15px', color: '#b87333', letterSpacing: 2,
    }).setOrigin(0.5);

    // ── 닉네임 입력 ──────────────────────────────────────────
    this.add.rectangle(cx, tabY + tabH / 2 + 28, tabW, 2, 0x5a3e1e);

    this._nickInput = this.add.dom(cx, cy - 34).createFromHTML(
      '<input id="nick" type="text" placeholder="닉네임 입력 (최대 12자)" maxlength="12" ' +
      'style="font-size:16px;padding:10px 14px;width:230px;text-align:center;' +
      'border-radius:2px;border:2px solid #b87333;border-bottom:2px solid #d4af37;' +
      'background:#1a0d05;color:#f5e6c8;outline:none;' +
      'font-family:Georgia,serif;letter-spacing:1px;">'
    );

    this.add.rectangle(cx, cy + 4, tabW, 2, 0x5a3e1e);

    // ── 버튼 ─────────────────────────────────────────────────
    this._makeBtn(cx - 120, cy + 52, '⚔  혼자 하기', () => this._startSolo());
    this._makeBtn(cx + 120, cy + 52, '🛡  함께 하기', () => this._goMulti());
    this._makeBtn(cx - 120, cy + 116, '⚙  설정',     () => {});
    this._makeBtn(cx + 120, cy + 116, '📜  길잡이',  () => this._showTutorial());

    this.add.text(W - 12, H - 12, 'v1.0', { fontSize: '10px', color: '#5a3e1e' }).setOrigin(1, 1);

    // ctx가 아직 suspended 상태면 "클릭하여 시작" 오버레이 표시
    if (!_audioReady) this._showStartOverlay(W, H);
  }

  _makeBtn(x, y, label, cb) {
    const w = 200, h = 46;
    this.add.rectangle(x + 3, y + 3, w, h, 0x0a0603);
    const bg = this.add.rectangle(x, y, w, h, 0x3d2e1a)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xb87333);
    this.add.rectangle(x, y - Math.floor(h / 2) + 3, w - 6, 4, 0x5a4030, 0.5);
    const txt = this.add.text(x, y, label, {
      fontSize: '15px', color: '#e8c88a', fontStyle: 'bold',
    }).setOrigin(0.5);
    bg.on('pointerover', () => {
      bg.setFillStyle(0x5a3e20); bg.setStrokeStyle(2, 0xd4af37); txt.setColor('#d4af37');
      SoundManager.get().sfxHover();
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x3d2e1a); bg.setStrokeStyle(2, 0xb87333); txt.setColor('#e8c88a');
    });
    bg.on('pointerdown', () => { SoundManager.get().sfxClick(); cb(); });
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

  _showStartOverlay(W, H) {
    const cx = W / 2, cy = H / 2;

    // 반투명 오버레이 (뒤 UI 비치게, topOnly=true라 버튼 클릭을 막음)
    const overlay = this.add.rectangle(cx, cy, W, H, 0x000000, 0.55)
      .setDepth(500).setInteractive();

    // 중앙 석판 힌트
    const boxW = 320, boxH = 80;
    const shadow = this.add.rectangle(cx + 3, cy + 3, boxW, boxH, 0x0a0603).setDepth(501);
    const box    = this.add.rectangle(cx, cy, boxW, boxH, 0x2d1a08)
      .setStrokeStyle(2, 0xb87333).setDepth(501);

    const hint = this.add.text(cx, cy, '🎵  클릭하여 시작', {
      fontSize: '20px', color: '#d4af37', fontStyle: 'bold',
      stroke: '#0a0603', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(502);

    this.tweens.add({
      targets: [box, hint],
      alpha: { from: 1, to: 0.45 },
      duration: 900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      document.removeEventListener('pointerdown', docDismiss, true);
      if (overlay.scene) overlay.destroy();
      if (shadow.scene) shadow.destroy();
      if (box.scene) box.destroy();
      if (hint.scene) hint.destroy();
    };

    // Phaser 캔버스 클릭 처리
    overlay.once('pointerdown', dismiss);

    // DOM 요소(닉네임 입력란 등) 클릭도 처리 — capture phase
    const docDismiss = () => dismiss();
    document.addEventListener('pointerdown', docDismiss, { passive: true, capture: true });

    // 씬 종료 시 정리
    this.events.once('shutdown', () => {
      document.removeEventListener('pointerdown', docDismiss, true);
    });
  }

  _showTutorial() {
    const W = this.scale.width, H = this.scale.height;
    const pw = W - 80, ph = H - 80;
    const cx = W / 2, cy = H / 2;

    // 반투명 어두운 오버레이
    const overlay = this.add.rectangle(cx, cy, W, H, 0x000000, 0.7).setDepth(50).setInteractive();

    // 석판 패널
    const panel = this.add.rectangle(cx + 4, cy + 4, pw, ph, 0x0a0603).setDepth(50);
    const stone = this.add.rectangle(cx, cy, pw, ph, 0x1e1005).setStrokeStyle(2, 0xb87333).setDepth(51);

    // 상단 장식 띠
    this.add.rectangle(cx, cy - ph / 2 + 24, pw, 48, 0x2d1a08).setDepth(52);
    this.add.rectangle(cx, cy - ph / 2 + 48, pw, 2, 0xb87333, 0.7).setDepth(52);
    this.add.text(cx, cy - ph / 2 + 24, '📜  게임 길잡이  📜', {
      fontSize: '20px', color: '#d4af37', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(53);

    const lines = [
      '═══════════════════════════════════════',
      '  카드를 다른 카드 위로 드래그하면 조합됩니다.',
      '  1초 길게 누르면 1장만 분리하여 드래그합니다.',
      '  숫자키 1~9 + 드래그로 여러 장 분리합니다.',
      '',
      '  ⛰ 바위 + 사람  →  돌 2장  (사람 유지)',
      '  🌲 나무 + 사람  →  목재 2장',
      '  🌾 농지 + 사람  →  식량 1장',
      '  🪨 돌 + 돌  →  벽돌  |  🍖 식량 + 식량  →  씨앗',
      '  🗡 목재 + 돌  →  창  |  🏹 창 + 목재  →  활',
      '  ⚔ 사람 + 창  →  전사  |  🏹 활 + 사람  →  궁수',
      '  🏠 벽돌 + 나무  →  목조 가옥  |  🏰 벽돌 + 벽돌  →  성벽',
      '',
      '  인구가 0이 되면 패배!',
      '  솔로: 최대한 오래 생존하세요.',
      '  PvP: 상대 인구를 모두 제거하거나 왕국 점수 30점 달성 시 승리!',
      '═══════════════════════════════════════',
      '            [ 클릭하여 닫기 ]',
    ];
    const txt = this.add.text(cx, cy + 20, lines.join('\n'), {
      fontSize: '13px', color: '#d4b87a', lineSpacing: 5, align: 'left',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setDepth(53);

    this._nickInput.setVisible(false);
    const close = () => {
      overlay.destroy(); panel.destroy(); stone.destroy(); txt.destroy();
      this._nickInput.setVisible(true);
    };
    overlay.on('pointerdown', close);
    stone.setInteractive();
    stone.on('pointerdown', close);
  }
}
