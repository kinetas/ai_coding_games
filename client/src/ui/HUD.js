export class HUD {
  constructor(scene, mode) {
    this._scene = scene;
    this._mode  = mode;
    this._build();
  }

  _build() {
    const W = this._scene.scale.width;
    const H = this._scene.scale.height;

    // 내 Stat 구역 (하단)
    this._scene.add.rectangle(W / 2, H - 50, W, 80, 0x000000, 0.7).setDepth(10);
    this._statText = this._scene.add.text(16, H - 84, '',
      { fontSize: '13px', color: '#ffffff', lineSpacing: 3 }).setDepth(11);

    // 왕국 건설 버튼
    this._kingdomBtn = this._scene.add.rectangle(W - 110, H - 50, 180, 44, 0x888888)
      .setDepth(11).setInteractive();
    this._kingdomBtnTxt = this._scene.add.text(W - 110, H - 50, '👑 왕국 건설',
      { fontSize: '15px', color: '#aaaaaa' }).setOrigin(0.5).setDepth(12);
    this._kingdomBtn.on('pointerdown', () => {
      if (this._kingdomEnabled) this._scene.events.emit('kingdom:build');
    });
    this._kingdomEnabled = false;

    // 솔로: 상단 생존 타이머
    if (this._mode === 'solo') {
      this._scene.add.rectangle(W / 2, 30, 220, 44, 0x000000, 0.6).setDepth(10);
      this._survivalText = this._scene.add.text(W / 2, 30, '⏱ 0:00',
        { fontSize: '22px', color: '#f5c842', fontStyle: 'bold' })
        .setOrigin(0.5).setDepth(11);
    }

    // PvP: 상단 상대방 구역
    if (this._mode === 'pvp') {
      this._scene.add.rectangle(W / 2, 30, W, 50, 0x000000, 0.7).setDepth(10);
      this._opponentText = this._scene.add.text(W / 2, 30,
        '상대방 정보 동기화 중...',
        { fontSize: '13px', color: '#cccccc' }).setOrigin(0.5).setDepth(11);
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

    this._statText.setText(
      `식량: ${food}  인구: ${pop}/${popLimit}  도시: ${cities}  성벽: ${walls}장  농지: ${farms}/${farmLim}  👑 ${kScore}/30  조합: ${combos}회`
    );

    const canBuild = kScore >= 30;
    this._kingdomEnabled = canBuild;
    this._kingdomBtn.setFillStyle(canBuild ? 0xd4a017 : 0x888888);
    this._kingdomBtnTxt.setColor(canBuild ? '#ffe066' : '#aaaaaa');

    if (this._mode === 'solo' && this._survivalText) {
      const t = state.survivalTime;
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      this._survivalText.setText(`⏱ ${m}:${String(s).padStart(2, '0')}`);
    }
  }

  updateOpponent(opData) {
    if (!this._opponentText) return;
    this._opponentText.setText(
      `인구: ${opData.pop} | 성벽: ${opData.hasWall ? '있음' : '없음'} | 도시: ${opData.cities} | 👑${opData.kingdomScore}`
    );
  }
}
