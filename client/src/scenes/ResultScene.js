export class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }

  create(data) {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;

    this.add.rectangle(cx, cy, W, H, 0x0a0a1a);

    const isWin = data.result === 'WIN';
    const title = data.mode === 'solo'
      ? '게임 종료'
      : (isWin ? '🏆 승리!' : '💀 패배');
    const tColor = (data.mode === 'pvp' && isWin) ? '#f5c842'
                 : (data.mode === 'pvp' && !isWin) ? '#ff4444'
                 : '#f5c842';

    this.add.text(cx, cy - 180, title,
      { fontSize: '52px', color: tColor, fontStyle: 'bold' }).setOrigin(0.5);

    if (data.mode === 'solo') {
      const t = data.survivalTime || 0;
      const m = Math.floor(t / 60), s = Math.floor(t % 60);
      this.add.text(cx, cy - 90,
        `조합 횟수: ${data.myScore}회\n생존 시간: ${m}분 ${String(s).padStart(2,'0')}초`,
        { fontSize: '26px', color: '#ffffff', align: 'center', lineSpacing: 14 }).setOrigin(0.5);

      if (data.isNewRecord) {
        this.add.text(cx, cy,
          '⭐ 신기록!', { fontSize: '30px', color: '#ffe066', fontStyle: 'bold' }).setOrigin(0.5);
      }
      const prev = data.prevBest || { combineCount: 0, survivalTime: 0 };
      this.add.text(cx, cy + 46,
        `이전 최고: ${prev.combineCount}회 / ${Math.floor(prev.survivalTime/60)}분 ${Math.floor(prev.survivalTime%60)}초`,
        { fontSize: '15px', color: '#888888' }).setOrigin(0.5);
    }

    if (data.mode === 'pvp') {
      const myCol = isWin ? '#00ff88' : '#ff4444';
      const opCol = isWin ? '#ff4444' : '#00ff88';
      this.add.text(cx - 110, cy - 60,
        `나\n${data.myScore}회`, { fontSize: '30px', color: myCol, align: 'center', lineSpacing: 8 }).setOrigin(0.5);
      this.add.text(cx, cy - 60, 'vs', { fontSize: '22px', color: '#888888' }).setOrigin(0.5);
      this.add.text(cx + 110, cy - 60,
        `상대\n${data.opScore}회`, { fontSize: '30px', color: opCol, align: 'center', lineSpacing: 8 }).setOrigin(0.5);
    }

    this._makeBtn(cx - 100, cy + 150, '재시작', 0x3a7d44, () => {
      this.scene.start('GameScene', { mode: data.mode, nickname: data.nickname });
    });
    this._makeBtn(cx + 100, cy + 150, '로비로', 0x2a5cb8, () => {
      this.scene.start('LobbyScene');
    });
  }

  _makeBtn(x, y, label, color, cb) {
    const bg = this.add.rectangle(x, y, 160, 46, color).setInteractive();
    this.add.text(x, y, label, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setAlpha(0.8));
    bg.on('pointerout',  () => bg.setAlpha(1));
    bg.on('pointerdown', cb);
  }
}
