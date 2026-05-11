import { SocketClient } from '../network/SocketClient.js';

export class WaitingScene extends Phaser.Scene {
  constructor() { super('WaitingScene'); }

  create(data) {
    this._data   = data;
    this._socket = null;
    this._role   = null;
    this._code   = data.code || '';
    this._ready  = false;
    this._canStart = false;

    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;

    // ── 배경 ─────────────────────────────────────────────────
    this.add.rectangle(cx, cy, W, H, 0x1a0d05);
    for (let x = 160; x < W; x += 160) this.add.rectangle(x, cy, 1, H, 0xffffff, 0.04);
    for (let y = 60; y < H; y += 60)  this.add.rectangle(cx, y, W, 1, 0xffffff, 0.04);

    this.add.rectangle(cx, 22, W, 44, 0x231208);
    this.add.rectangle(cx, 44, W, 2, 0xb87333, 0.6);
    this.add.rectangle(cx, H - 22, W, 44, 0x231208);
    this.add.rectangle(cx, H - 44, W, 2, 0xb87333, 0.4);

    // 횃불
    this.add.text(50, cy, '🔥', { fontSize: '28px' }).setOrigin(0.5);
    this.add.text(W - 50, cy, '🔥', { fontSize: '28px' }).setOrigin(0.5);

    // ── 중앙 석판 패널 ──────────────────────────────────────
    const panW = 500, panH = 460;
    this.add.rectangle(cx + 4, cy + 4, panW, panH, 0x0a0603);
    this.add.rectangle(cx, cy, panW, panH, 0x1e1005).setStrokeStyle(2, 0xb87333);

    // 패널 헤더
    this.add.rectangle(cx, cy - panH / 2 + 30, panW, 60, 0x2d1a08);
    this.add.rectangle(cx, cy - panH / 2 + 60, panW, 2, 0xb87333, 0.6);
    this.add.text(cx, cy - panH / 2 + 30, '⚔  전장 대기실  ⚔', {
      fontSize: '22px', color: '#d4af37', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 방코드 표시
    this._codeText = this.add.text(cx, cy - panH / 2 + 90, `방코드: ${this._code || '생성 중...'}`, {
      fontSize: '22px', color: '#d4af37', fontStyle: 'bold', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // 플레이어 구역
    this.add.rectangle(cx, cy - panH / 2 + 124, panW - 40, 1, 0x5a3e1e);
    this.add.text(cx, cy - panH / 2 + 140, '전사 현황', {
      fontSize: '13px', color: '#8a7050',
    }).setOrigin(0.5);

    this._hostText  = this.add.text(cx, cy - panH / 2 + 170, '● 방장: 대기 중', {
      fontSize: '18px', color: '#5a4030', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    this._guestText = this.add.text(cx, cy - panH / 2 + 206, '● 게스트: 대기 중', {
      fontSize: '18px', color: '#5a4030', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this.add.rectangle(cx, cy - panH / 2 + 238, panW - 40, 1, 0x5a3e1e);

    // 상태 메시지
    this._statusText = this.add.text(cx, cy - panH / 2 + 266, '서버 연결 중...', {
      fontSize: '14px', color: '#8a7050', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // 카운트다운
    this._countText = this.add.text(cx, cy - panH / 2 + 320, '', {
      fontSize: '72px', color: '#d4af37', fontStyle: 'bold',
      stroke: '#4a2200', strokeThickness: 5,
    }).setOrigin(0.5);

    // Ready 버튼
    this.add.rectangle(cx + 3, cy + panH / 2 - 104, 200, 46, 0x0a0603);
    this._readyBtn = this.add.rectangle(cx, cy + panH / 2 - 107, 200, 46, 0x3d2e1a)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xb87333);
    this.add.rectangle(cx, cy + panH / 2 - 107 - 19, 194, 4, 0x5a4030, 0.5);
    this._readyBtnTxt = this.add.text(cx, cy + panH / 2 - 107, 'Ready', {
      fontSize: '18px', color: '#e8c88a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._readyBtn.on('pointerdown', () => this._toggleReady());
    this._readyBtn.on('pointerover', () => this._readyBtn.setStrokeStyle(2, 0xd4af37));
    this._readyBtn.on('pointerout',  () => this._readyBtn.setStrokeStyle(2, 0xb87333));

    // 방장 전용 시작 버튼
    this.add.rectangle(cx + 3, cy + panH / 2 - 50, 230, 46, 0x0a0603);
    this._startBtn = this.add.rectangle(cx, cy + panH / 2 - 53, 230, 46, 0x3d2810)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x5a3e1e);
    this.add.rectangle(cx, cy + panH / 2 - 53 - 19, 224, 4, 0x4a3020, 0.5);
    this._startBtnTxt = this.add.text(cx, cy + panH / 2 - 53, '▶  게임 시작', {
      fontSize: '18px', color: '#6a5040', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._startBtn.setVisible(false);
    this._startBtnTxt.setVisible(false);
    this._startBtn.on('pointerdown', () => {
      if (this._canStart) this._socket?.startGame();
    });

    // 뒤로가기
    this.add.rectangle(cx, H - 22, W, 44, 0x231208);
    this._makeBtn(cx, H - 22, '← 뒤로', () => {
      this._socket?.disconnect();
      this.scene.start('RoomScene', { nickname: this._data.nickname });
    }, 160, 34);

    this._connectSocket();
  }

  _makeBtn(x, y, label, cb, w = 180, h = 40) {
    const bg = this.add.rectangle(x, y, w, h, 0x3d2e1a)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x5a3e1e);
    this.add.text(x, y, label, { fontSize: '14px', color: '#8a7050' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setStrokeStyle(1, 0xb87333));
    bg.on('pointerout',  () => bg.setStrokeStyle(1, 0x5a3e1e));
    bg.on('pointerdown', cb);
  }

  _connectSocket() {
    try {
      this._socket = new SocketClient(this);

      this.events.on('net:roomCreated', (d) => {
        this._role = 'host';
        this._code = d.code;
        this._codeText.setText(`방코드: ${d.code}`);
        this._statusText.setText('상대방을 기다리는 중...').setColor('#b87333');
        this._startBtn.setVisible(true);
        this._startBtnTxt.setVisible(true);
      });

      this.events.on('net:roomJoined', (d) => {
        if (d.role) this._role = d.role;
        if (d.code) { this._code = d.code; this._codeText.setText(`방코드: ${d.code}`); }
        if (d.p1) this._hostText.setText(`● 방장: ${d.p1}`);
        if (d.p2) this._guestText.setText(`● 게스트: ${d.p2}`);
        this._statusText.setText(this._role === 'host' ? '방 생성 완료!' : '방 입장 완료!').setColor('#70a850');
      });

      this.events.on('net:joinError', (d) => {
        this._statusText.setText(`오류: ${d.msg}`).setColor('#c84040');
      });

      this.events.on('net:readyUpdate', (d) => {
        this._hostText.setColor(d.p1Ready ? '#70a850' : '#5a4030');
        this._guestText.setColor(d.p2Ready ? '#70a850' : '#5a4030');
        this._canStart = d.p1Ready && d.p2Ready;
        if (this._startBtn.visible) {
          this._startBtn.setFillStyle(this._canStart ? 0x3d5a20 : 0x3d2810);
          this._startBtn.setStrokeStyle(2, this._canStart ? 0xb87333 : 0x5a3e1e);
          this._startBtnTxt.setColor(this._canStart ? '#e8c88a' : '#6a5040');
        }
      });

      this.events.on('net:gameStarting', () => {
        this._statusText.setText('전투 시작!').setColor('#d4af37');
      });

      this.events.on('net:countdown', (d) => {
        this._countText.setText(String(d.n > 0 ? d.n : ''));
      });

      this.events.on('net:gameStart', () => {
        this.scene.start('GameScene', {
          mode: 'pvp',
          nickname: this._data.nickname,
          role: this._role,
          socket: this._socket,
        });
      });

      if (this._data.action === 'create') {
        this._socket.createRoom(this._data.nickname);
        this._statusText.setText('방 생성 중...').setColor('#8a7050');
      } else {
        this._socket.joinRoom(this._data.nickname, this._data.code);
        this._statusText.setText('방 입장 중...').setColor('#8a7050');
      }
    } catch (e) {
      this._statusText.setText('서버 연결 실패 (솔로 모드를 이용해주세요)').setColor('#c84040');
    }
  }

  _toggleReady() {
    this._ready = !this._ready;
    this._socket?.setReady(this._ready);
    this._readyBtn.setFillStyle(this._ready ? 0x3d5a20 : 0x3d2e1a);
    this._readyBtn.setStrokeStyle(2, this._ready ? 0xd4af37 : 0xb87333);
    this._readyBtnTxt.setText(this._ready ? '✓  Ready!' : 'Ready');
    this._readyBtnTxt.setColor(this._ready ? '#d4af37' : '#e8c88a');
  }
}
