export class HUD {
  constructor(scene, mode) {
    this._scene = scene;
    this._mode  = mode;
    this._build();
  }

  _build() {
    const W = this._scene.scale.width;
    const H = this._scene.scale.height;

    // ── 내 Stat 구역 (하단 석판) ─────────────────────────────
    // 그림자
    this._scene.add.rectangle(W / 2 + 2, H - 44 + 2, W - 36, 76, 0x0a0603).setDepth(10);
    // 석판 본체
    this._scene.add.rectangle(W / 2, H - 44, W - 36, 76, 0x1e1005, 0.95)
      .setStrokeStyle(1, 0xb87333, 0.7).setDepth(10);
    // 상단 청동 선
    this._scene.add.rectangle(W / 2, H - 80, W - 36, 2, 0xb87333, 0.5).setDepth(10);

    this._statText = this._scene.add.text(46, H - 76, '', {
      fontSize: '13px', color: '#d4b87a',
      lineSpacing: 3, fontFamily: 'Georgia, serif',
    }).setDepth(11);

    // ── 왕국 건설 버튼 ───────────────────────────────────────
    const bx = W - 106, by = H - 44;
    this._scene.add.rectangle(bx + 2, by + 2, 180, 46, 0x0a0603).setDepth(11);
    this._kingdomBtn = this._scene.add.rectangle(bx, by, 180, 46, 0x2d1a08)
      .setDepth(11).setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x5a3e1e);
    this._scene.add.rectangle(bx, by - 18, 174, 4, 0x3d2810, 0.5).setDepth(12);
    this._kingdomBtnTxt = this._scene.add.text(bx, by, '👑 왕국 건설', {
      fontSize: '14px', color: '#6a5040', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(12);
    this._kingdomBtn.on('pointerdown', () => {
      if (this._kingdomEnabled) this._scene.events.emit('kingdom:build');
    });
    this._kingdomBtn.on('pointerover', () => {
      if (this._kingdomEnabled) this._kingdomBtn.setStrokeStyle(2, 0xd4af37);
    });
    this._kingdomBtn.on('pointerout', () => {
      this._kingdomBtn.setStrokeStyle(2, this._kingdomEnabled ? 0xb87333 : 0x5a3e1e);
    });
    this._kingdomEnabled = false;

    // ── 솔로: 상단 생존 타이머 석판 ─────────────────────────
    if (this._mode === 'solo') {
      this._scene.add.rectangle(W / 2 + 2, 30 + 2, 240, 44, 0x0a0603).setDepth(10);
      this._scene.add.rectangle(W / 2, 30, 240, 44, 0x1e1005, 0.92)
        .setStrokeStyle(1, 0xb87333, 0.6).setDepth(10);
      this._survivalText = this._scene.add.text(W / 2, 30, '⏱ 0:00', {
        fontSize: '20px', color: '#d4af37', fontStyle: 'bold',
        fontFamily: 'Georgia, serif',
      }).setOrigin(0.5).setDepth(11);
    }

    // ── PvP: 상단 상대방 석판 ───────────────────────────────
    if (this._mode === 'pvp') {
      this._scene.add.rectangle(W / 2 + 2, 30 + 2, W - 36, 44, 0x0a0603).setDepth(10);
      this._scene.add.rectangle(W / 2, 30, W - 36, 44, 0x1e1005, 0.92)
        .setStrokeStyle(1, 0xb87333, 0.5).setDepth(10);
      // 하단 청동 선
      this._scene.add.rectangle(W / 2, 52, W - 36, 2, 0xb87333, 0.4).setDepth(10);
      this._opponentText = this._scene.add.text(W / 2, 30,
        '상대방 정보 동기화 중...', {
          fontSize: '13px', color: '#8a7050', fontFamily: 'Georgia, serif',
        }).setOrigin(0.5).setDepth(11);
    }
  }

  refresh(state, engine) {
    const cards    = state.cards;
    const pop      = cards.filter(c => ['PERSON','WARRIOR','ARCHER'].includes(c.type)).reduce((s, c) => s + c.count, 0);
    const popLimit = engine._calcPopLimit(cards);
    const food     = cards.filter(c => c.type === 'FOOD').reduce((s, c) => s + c.count, 0);
    const walls    = cards.filter(c => c.type === 'WALL').reduce((s, c) => s + c.count, 0);
    const cities   = cards.filter(c => c.type === 'CITY').reduce((s, c) => s + c.count, 0);
    const farms    = cards.filter(c => c.type === 'FARMLAND').reduce((s, c) => s + c.count, 0);
    const farmLim  = engine._calcFarmLimit(cards);
    const kScore   = engine.calcKingdomScore(cards);
    const combos   = state.combineCount;

    // 인구 경고색
    const popColor = pop >= popLimit ? '#c84040' : '#d4b87a';
    this._statText.setText(
      `🍖 식량: ${food}   👥 인구: ${pop}/${popLimit}   🏙 도시: ${cities}   🏰 성벽: ${walls}장   🌾 농지: ${farms}/${farmLim}   👑 ${kScore}/30   ⚒ 조합: ${combos}회`
    ).setColor(popColor);

    const canBuild = kScore >= 30;
    this._kingdomEnabled = canBuild;
    if (canBuild) {
      this._kingdomBtn.setFillStyle(0x3d2808);
      this._kingdomBtn.setStrokeStyle(2, 0xb87333);
      this._kingdomBtnTxt.setColor('#d4af37');
    } else {
      this._kingdomBtn.setFillStyle(0x2d1a08);
      this._kingdomBtn.setStrokeStyle(2, 0x5a3e1e);
      this._kingdomBtnTxt.setColor('#6a5040');
    }

    if (this._mode === 'solo' && this._survivalText) {
      const t = state.survivalTime;
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      this._survivalText.setText(`⏱ ${m}:${String(s).padStart(2, '0')}`);
    }
  }

  updateOpponent(opData) {
    if (!this._opponentText) return;
    const wallTxt = opData.hasWall ? '있음' : '없음';
    this._opponentText.setText(
      `👥 인구: ${opData.pop}   🏰 성벽: ${wallTxt}   🏙 도시: ${opData.cities}   👑 ${opData.kingdomScore}/30`
    ).setColor('#b87333');
  }
}
