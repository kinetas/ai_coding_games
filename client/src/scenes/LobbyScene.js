import { SoundManager } from '../ui/SoundManager.js';

export class LobbyScene extends Phaser.Scene {
  constructor() { super('LobbyScene'); }

  create() {
    SoundManager.get().playLobbyBGM();
    const W = this.scale.width;
    const _audioReady = SoundManager.get().isRunning(); // 게임에서 돌아온 경우 true
    const H = this.scale.height;
    const cx = W / 2, cy = H / 2;

    // ── 배경: Inscryption 다크 우드 테이블 ──────────────────────
    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(0x070402, 1);
    bgGfx.fillRect(0, 0, W, H);
    // 목재 결
    for (let y = 0; y < H; y += 5) {
      bgGfx.fillStyle(0x2a1408, 0.01 + Math.abs(Math.sin(y * 0.14)) * 0.012);
      bgGfx.fillRect(0, y, W, 1);
    }
    for (let y = 0; y < H; y += 72) {
      bgGfx.fillStyle(0x160a04, 0.06);
      bgGfx.fillRect(0, y, W, 2);
    }
    // 비네트 (어두운 가장자리)
    bgGfx.fillStyle(0x000000, 0.38);
    bgGfx.fillRect(0, 0, 60, H); bgGfx.fillRect(W - 60, 0, 60, H);
    bgGfx.fillRect(0, 0, W, 48); bgGfx.fillRect(0, H - 48, W, 48);
    // 촛불 글로우 (4 모서리)
    [[55, 62], [W - 55, 62], [55, H - 62], [W - 55, H - 62]].forEach(([gx, gy]) => {
      bgGfx.fillStyle(0xe05808, 0.04); bgGfx.fillCircle(gx, gy, 120);
      bgGfx.fillStyle(0xe07818, 0.07); bgGfx.fillCircle(gx, gy, 68);
      bgGfx.fillStyle(0xf09030, 0.13); bgGfx.fillCircle(gx, gy, 38);
      bgGfx.fillStyle(0xffe870, 0.23); bgGfx.fillCircle(gx, gy, 16);
      bgGfx.fillStyle(0xffffff, 0.32); bgGfx.fillCircle(gx, gy, 7);
    });
    // 부족 테두리 프레임
    bgGfx.fillStyle(0x180c04, 1);
    bgGfx.fillRect(0, 0, W, 14); bgGfx.fillRect(0, H - 14, W, 14);
    bgGfx.fillRect(0, 0, 14, H); bgGfx.fillRect(W - 14, 0, 14, H);
    bgGfx.fillStyle(0x8a5a28, 0.78);
    bgGfx.fillRect(0, 14, W, 2); bgGfx.fillRect(0, H - 16, W, 2);
    bgGfx.fillRect(14, 0, 2, H); bgGfx.fillRect(W - 16, 0, 2, H);
    bgGfx.fillStyle(0xc8960a, 0.22);
    bgGfx.fillRect(0, 16, W, 1); bgGfx.fillRect(0, H - 17, W, 1);
    // 테두리 대시 문양
    bgGfx.fillStyle(0xc8960a, 0.42);
    for (let bx = 20; bx < W - 14; bx += 20) {
      bgGfx.fillRect(bx, 3, 10, 8); bgGfx.fillRect(bx, H - 11, 10, 8);
    }
    for (let by = 20; by < H - 14; by += 20) {
      bgGfx.fillRect(3, by, 8, 10); bgGfx.fillRect(W - 11, by, 8, 10);
    }
    // 모서리 황금 블록
    bgGfx.fillStyle(0xc8960a, 0.92);
    [[0, 0], [W - 14, 0], [0, H - 14], [W - 14, H - 14]].forEach(([bx, by]) => bgGfx.fillRect(bx, by, 14, 14));
    bgGfx.fillStyle(0x070402, 1);
    [[4, 4], [W - 10, 4], [4, H - 10], [W - 10, H - 10]].forEach(([bx, by]) => bgGfx.fillRect(bx, by, 6, 6));

    // 촛불 이모지
    this.add.text(55, 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);
    this.add.text(W - 55, 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);
    this.add.text(55, H - 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);
    this.add.text(W - 55, H - 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);

    // ── 타이틀 보드 (어두운 목재판) ─────────────────────────────
    const tabW = 560, tabH = 110, tabY = cy - 165;

    this.add.rectangle(cx + 6, tabY + 6, tabW, tabH, 0x000000, 0.82);
    this.add.rectangle(cx, tabY, tabW, tabH, 0x0e0905).setStrokeStyle(2, 0x8a5a28);

    // 안쪽 인셋 테두리
    const titInner = this.add.graphics();
    titInner.lineStyle(1, 0x4a2c10, 0.5);
    titInner.strokeRect(cx - tabW / 2 + 6, tabY - tabH / 2 + 6, tabW - 12, tabH - 12);

    // 부족 L-모서리 표식
    const titCorner = this.add.graphics();
    titCorner.fillStyle(0xc8960a, 0.82);
    const L = 12, t = 2;
    [[cx - tabW / 2 + 5, tabY - tabH / 2 + 5, true, true],
     [cx + tabW / 2 - 5 - L, tabY - tabH / 2 + 5, false, true],
     [cx - tabW / 2 + 5, tabY + tabH / 2 - 5 - t, true, false],
     [cx + tabW / 2 - 5 - L, tabY + tabH / 2 - 5 - t, false, false]
    ].forEach(([px, py, h_right, v_down]) => {
      titCorner.fillRect(px, py, L, t);
      titCorner.fillRect(h_right ? px : px + L - t, v_down ? py : py - L + t, t, L);
    });

    // 타이틀 텍스트
    this.add.text(cx, tabY - 16, '⚒  CardForge Online  ⚒', {
      fontSize: '34px', color: '#c8960a', fontStyle: 'bold',
      stroke: '#050302', strokeThickness: 5,
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    this.add.text(cx, tabY + 24, '원시 카드 경영 & 전략 서바이벌', {
      fontSize: '14px', color: '#6a4010', letterSpacing: 2,
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // 구분선
    this.add.rectangle(cx, tabY + tabH / 2 + 24, tabW, 1, 0x4a2c10);
    this.add.rectangle(cx, tabY + tabH / 2 + 25, tabW, 1, 0xc8960a, 0.18);

    // ── 닉네임 입력 ──────────────────────────────────────────────
    this._nickInput = this.add.dom(cx, cy - 34).createFromHTML(
      '<input id="nick" type="text" placeholder="닉네임 입력 (최대 12자)" maxlength="12" ' +
      'style="font-size:16px;padding:10px 14px;width:230px;text-align:center;' +
      'border-radius:1px;border:1px solid #4a2c10;border-bottom:2px solid #8a5a28;' +
      'background:#0c0804;color:#e0c890;outline:none;' +
      'font-family:Georgia,serif;letter-spacing:1px;">'
    );

    this.add.rectangle(cx, cy + 4, 560, 1, 0x3a1e08);

    // ── 버튼 ─────────────────────────────────────────────────────
    this._makeBtn(cx - 120, cy + 52, '⚔  혼자 하기', () => this._startSolo());
    this._makeBtn(cx + 120, cy + 52, '🛡  함께 하기', () => this._goMulti());
    this._makeBtn(cx - 120, cy + 116, '⚙  설정',      () => {});
    this._makeBtn(cx + 120, cy + 116, '📜  길잡이',   () => this._showTutorial());

    this.add.text(W - 12, H - 12, 'v1.0', { fontSize: '10px', color: '#5a3e1e' }).setOrigin(1, 1);

    // ctx가 아직 suspended 상태면 "클릭하여 시작" 오버레이 표시
    if (!_audioReady) this._showStartOverlay(W, H);
  }

  _makeBtn(x, y, label, cb) {
    const w = 200, h = 46;
    this.add.rectangle(x + 4, y + 4, w, h, 0x000000, 0.78);
    const bg = this.add.rectangle(x, y, w, h, 0x140a04)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x8a5a28);
    this.add.rectangle(x, y - Math.floor(h / 2) + 4, w - 8, 2, 0x2c1808, 0.5);
    // 버튼 양쪽 부족 표식
    const bGfx = this.add.graphics();
    bGfx.fillStyle(0x8a5a28, 0.35);
    bGfx.fillRect(x - w / 2 + 5, y - 4, 5, 8);
    bGfx.fillRect(x + w / 2 - 10, y - 4, 5, 8);
    const txt = this.add.text(x, y, label, {
      fontSize: '15px', color: '#d4b870', fontStyle: 'bold',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    bg.on('pointerover', () => {
      bg.setFillStyle(0x5a3e20); bg.setStrokeStyle(2, 0xd4af37); txt.setColor('#d4af37');
      SoundManager.get().sfxHover();
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x140a04); bg.setStrokeStyle(2, 0x8a5a28); txt.setColor('#d4b870');
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

    const overlay = this.add.rectangle(cx, cy, W, H, 0x000000, 0.82).setDepth(50).setInteractive();
    const panel   = this.add.rectangle(cx + 5, cy + 5, pw, ph, 0x000000, 0.82).setDepth(50);
    const stone   = this.add.rectangle(cx, cy, pw, ph, 0x0e0905).setStrokeStyle(2, 0x8a5a28).setDepth(51);

    this.add.rectangle(cx, cy - ph / 2 + 26, pw, 52, 0x0a0704).setDepth(52);
    this.add.rectangle(cx, cy - ph / 2 + 52, pw, 1, 0x8a5a28, 0.85).setDepth(52);
    this.add.text(cx, cy - ph / 2 + 26, '📜  게임 길잡이  📜', {
      fontSize: '20px', color: '#c8960a', fontStyle: 'bold',
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
      fontSize: '13px', color: '#c8a060', lineSpacing: 5, align: 'left',
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
