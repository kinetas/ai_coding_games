export class HUD {
  constructor(scene, mode) {
    this._scene = scene;
    this._mode  = mode;
    this._build();
  }

  _build() {
    const W = this._scene.scale.width;
    const H = this._scene.scale.height;

    // ── 내 Stat 구역 (하단 조각 석판) ──────────────────────────
    this._scene.add.rectangle(W / 2 + 3, H - 44 + 3, W - 28, 76, 0x000000, 0.82).setDepth(10);
    this._scene.add.rectangle(W / 2, H - 44, W - 28, 76, 0x0f0804, 0.98)
      .setStrokeStyle(1, 0x8a5a28, 0.85).setDepth(10);
    // 상단 구분선
    this._scene.add.rectangle(W / 2, H - 82, W - 28, 2, 0x8a5a28, 0.55).setDepth(10);
    this._scene.add.rectangle(W / 2, H - 84, W - 28, 1, 0xc8960a, 0.2).setDepth(10);

    // 부족 모서리 표식 (석판)
    const panGfx = this._scene.add.graphics().setDepth(10);
    panGfx.fillStyle(0xc8960a, 0.65);
    panGfx.fillRect(18, H - 82, 8, 2);   panGfx.fillRect(18, H - 82, 2, 8);
    panGfx.fillRect(18, H - 10, 8, 2);   panGfx.fillRect(18, H - 10, 2, -8);
    panGfx.fillRect(W - 26, H - 82, 8, 2); panGfx.fillRect(W - 20, H - 82, 2, 8);
    panGfx.fillRect(W - 26, H - 10, 8, 2); panGfx.fillRect(W - 20, H - 10, 2, -8);

    this._statText = this._scene.add.text(40, H - 78, '', {
      fontSize: '13px', color: '#d4b870',
      lineSpacing: 3, fontFamily: 'Georgia, serif',
    }).setDepth(11);

    // ── 왕국 건설 버튼 (조각 뼈/돌) ─────────────────────────────
    const bx = W - 106, by = H - 44;
    this._scene.add.rectangle(bx + 3, by + 3, 180, 46, 0x000000, 0.8).setDepth(11);
    this._kingdomBtn = this._scene.add.rectangle(bx, by, 180, 46, 0x1a0e06)
      .setDepth(11).setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x4a2c10);
    this._scene.add.rectangle(bx, by - 18, 172, 2, 0x2c1808, 0.5).setDepth(12);
    this._kingdomBtnTxt = this._scene.add.text(bx, by, '👑 왕국 건설', {
      fontSize: '14px', color: '#4a2c10', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(12);

    this._kingdomBtn.on('pointerdown', () => {
      if (this._kingdomEnabled) this._scene.events.emit('kingdom:build');
    });
    this._kingdomBtn.on('pointerover', () => {
      if (this._kingdomEnabled) this._kingdomBtn.setStrokeStyle(2, 0xc8960a);
    });
    this._kingdomBtn.on('pointerout', () => {
      this._kingdomBtn.setStrokeStyle(2, this._kingdomEnabled ? 0x8a5a28 : 0x4a2c10);
    });
    this._kingdomEnabled = false;

    // ── 솔로: 생존 타이머 ────────────────────────────────────────
    if (this._mode === 'solo') {
      this._scene.add.rectangle(W / 2 + 3, 30 + 3, 240, 44, 0x000000, 0.8).setDepth(10);
      this._scene.add.rectangle(W / 2, 30, 240, 44, 0x0f0804, 0.95)
        .setStrokeStyle(1, 0x8a5a28, 0.7).setDepth(10);
      this._survivalText = this._scene.add.text(W / 2, 30, '⏱ 0:00', {
        fontSize: '20px', color: '#c8960a', fontStyle: 'bold',
        fontFamily: 'Georgia, serif',
      }).setOrigin(0.5).setDepth(11);
    }

    // ── PvP: 상대방 석판 ─────────────────────────────────────────
    if (this._mode === 'pvp') {
      this._scene.add.rectangle(W / 2 + 3, 30 + 3, W - 28, 44, 0x000000, 0.8).setDepth(10);
      this._scene.add.rectangle(W / 2, 30, W - 28, 44, 0x0f0804, 0.95)
        .setStrokeStyle(1, 0x8a5a28, 0.5).setDepth(10);
      this._scene.add.rectangle(W / 2, 52, W - 28, 2, 0x8a5a28, 0.4).setDepth(10);
      this._opponentText = this._scene.add.text(W / 2, 30,
        '상대방 정보 동기화 중...', {
          fontSize: '13px', color: '#6a4820', fontFamily: 'Georgia, serif',
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
    const boats    = cards.filter(c => c.type === 'BOAT').reduce((s, c) => s + c.count, 0);
    const boatLim  = engine._calcBoatLimit(cards);
    const kScore   = engine.calcKingdomScore(cards);
    const combos   = state.combineCount;

    const popColor = pop >= popLimit ? '#a03020' : '#d4b870';
    this._statText.setText(
      `🍖 식량: ${food}   👥 인구: ${pop}/${popLimit}   🏙 도시: ${cities}   🏰 성벽: ${walls}장   🌾 농지: ${farms}/${farmLim}   ⛵ 배: ${boats}/${boatLim}   👑 ${kScore}/30   ⚒ 조합: ${combos}회`
    ).setColor(popColor);

    const canBuild = kScore >= 30;
    this._kingdomEnabled = canBuild;
    if (canBuild) {
      this._kingdomBtn.setFillStyle(0x2a1c0a);
      this._kingdomBtn.setStrokeStyle(2, 0x8a5a28);
      this._kingdomBtnTxt.setColor('#c8960a');
    } else {
      this._kingdomBtn.setFillStyle(0x1a0e06);
      this._kingdomBtn.setStrokeStyle(2, 0x4a2c10);
      this._kingdomBtnTxt.setColor('#4a2c10');
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
    ).setColor('#8a5a28');
  }

  updateScoutReport(data) {
    if (!this._opponentText) return;
    this._opponentText.setText(
      `🔭 정찰 중 | ⚔️ 전사: ${data.warriors}  🏹 궁수: ${data.archers}  👤 사람: ${data.persons}` +
      `  🍖 식량: ${data.food}  🏰 성벽: ${data.walls}장  🏙 도시: ${data.cities}  ⛵ 배: ${data.boats}  👑 ${data.kingdomScore}/30`
    ).setColor('#5a90c0');
  }
}
