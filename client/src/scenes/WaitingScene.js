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

    // ── 배경: 다크 우드 테이블 ──────────────────────────────────
    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(0x070402, 1);
    bgGfx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 5) {
      bgGfx.fillStyle(0x2a1408, 0.01 + Math.abs(Math.sin(y * 0.14)) * 0.012);
      bgGfx.fillRect(0, y, W, 1);
    }
    bgGfx.fillStyle(0x000000, 0.38);
    bgGfx.fillRect(0, 0, 60, H); bgGfx.fillRect(W - 60, 0, 60, H);
    bgGfx.fillRect(0, 0, W, 48); bgGfx.fillRect(0, H - 48, W, 48);
    [[55, 62], [W - 55, 62], [55, H - 62], [W - 55, H - 62]].forEach(([gx, gy]) => {
      bgGfx.fillStyle(0xe05808, 0.04); bgGfx.fillCircle(gx, gy, 110);
      bgGfx.fillStyle(0xe07818, 0.07); bgGfx.fillCircle(gx, gy, 64);
      bgGfx.fillStyle(0xf09030, 0.12); bgGfx.fillCircle(gx, gy, 36);
      bgGfx.fillStyle(0xffe870, 0.22); bgGfx.fillCircle(gx, gy, 15);
      bgGfx.fillStyle(0xffffff, 0.30); bgGfx.fillCircle(gx, gy, 7);
    });
    bgGfx.fillStyle(0x180c04, 1);
    bgGfx.fillRect(0, 0, W, 14); bgGfx.fillRect(0, H - 14, W, 14);
    bgGfx.fillRect(0, 0, 14, H); bgGfx.fillRect(W - 14, 0, 14, H);
    bgGfx.fillStyle(0x8a5a28, 0.78);
    bgGfx.fillRect(0, 14, W, 2); bgGfx.fillRect(0, H - 16, W, 2);
    bgGfx.fillRect(14, 0, 2, H); bgGfx.fillRect(W - 16, 0, 2, H);
    bgGfx.fillStyle(0xc8960a, 0.42);
    for (let bx = 20; bx < W - 14; bx += 20) {
      bgGfx.fillRect(bx, 3, 10, 8); bgGfx.fillRect(bx, H - 11, 10, 8);
    }
    for (let by = 20; by < H - 14; by += 20) {
      bgGfx.fillRect(3, by, 8, 10); bgGfx.fillRect(W - 11, by, 8, 10);
    }
    bgGfx.fillStyle(0xc8960a, 0.92);
    [[0, 0], [W - 14, 0], [0, H - 14], [W - 14, H - 14]].forEach(([bx, by]) => bgGfx.fillRect(bx, by, 14, 14));
    bgGfx.fillStyle(0x070402, 1);
    [[4, 4], [W - 10, 4], [4, H - 10], [W - 10, H - 10]].forEach(([bx, by]) => bgGfx.fillRect(bx, by, 6, 6));

    this.add.text(55, 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);
    this.add.text(W - 55, 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);
    this.add.text(55, H - 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);
    this.add.text(W - 55, H - 62, '🕯', { fontSize: '18px' }).setOrigin(0.5);

    // ── 중앙 목재 패널 ───────────────────────────────────────────
    const panW = 500, panH = 460;

    this.add.rectangle(cx + 5, cy + 5, panW, panH, 0x000000, 0.82);
    this.add.rectangle(cx, cy, panW, panH, 0x0f0905).setStrokeStyle(2, 0x8a5a28);

    const hH = 60;
    this.add.rectangle(cx, cy - panH / 2 + hH / 2, panW, hH, 0x0a0704);
    this.add.rectangle(cx, cy - panH / 2 + hH, panW, 1, 0x8a5a28, 0.85);
    this.add.rectangle(cx, cy - panH / 2 + hH + 1, panW, 1, 0xc8960a, 0.2);

    const pGfx = this.add.graphics();
    pGfx.fillStyle(0xc8960a, 0.72);
    [[cx - panW / 2 + 4, cy - panH / 2 + 4], [cx + panW / 2 - 10, cy - panH / 2 + 4],
     [cx - panW / 2 + 4, cy + panH / 2 - 10], [cx + panW / 2 - 10, cy + panH / 2 - 10]]
      .forEach(([px, py]) => pGfx.fillRect(px, py, 6, 6));

    this.add.text(cx, cy - panH / 2 + hH / 2, '⚔  전장 대기실  ⚔', {
      fontSize: '22px', color: '#c8960a', fontStyle: 'bold',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // 방코드 표시
    this._codeText = this.add.text(cx, cy - panH / 2 + hH + 28, `방코드: ${this._code || '생성 중...'}`, {
      fontSize: '22px', color: '#c8960a', fontStyle: 'bold', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // 플레이어 구역
    this.add.rectangle(cx, cy - panH / 2 + hH + 62, panW - 40, 1, 0x3a1e08);
    this.add.text(cx, cy - panH / 2 + hH + 78, '전사 현황', {
      fontSize: '13px', color: '#6a4010',
    }).setOrigin(0.5);

    this._hostText  = this.add.text(cx, cy - panH / 2 + hH + 108, '● 방장: 대기 중', {
      fontSize: '18px', color: '#3a2010', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    this._guestText = this.add.text(cx, cy - panH / 2 + hH + 144, '● 게스트: 대기 중', {
      fontSize: '18px', color: '#3a2010', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this.add.rectangle(cx, cy - panH / 2 + hH + 176, panW - 40, 1, 0x3a1e08);

    // 상태 메시지
    this._statusText = this.add.text(cx, cy - panH / 2 + hH + 204, '서버 연결 중...', {
      fontSize: '14px', color: '#6a4010', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // 카운트다운
    this._countText = this.add.text(cx, cy - panH / 2 + hH + 258, '', {
      fontSize: '72px', color: '#c8960a', fontStyle: 'bold',
      stroke: '#050302', strokeThickness: 5,
    }).setOrigin(0.5);

    // Ready 버튼
    this.add.rectangle(cx + 3, cy + panH / 2 - 104, 200, 46, 0x000000, 0.78);
    this._readyBtn = this.add.rectangle(cx, cy + panH / 2 - 107, 200, 46, 0x140a04)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x8a5a28);
    this.add.rectangle(cx, cy + panH / 2 - 107 - 19, 192, 2, 0x2a1608, 0.5);
    this._readyBtnTxt = this.add.text(cx, cy + panH / 2 - 107, 'Ready', {
      fontSize: '18px', color: '#d4b870', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._readyBtn.on('pointerdown', () => this._toggleReady());
    this._readyBtn.on('pointerover', () => this._readyBtn.setStrokeStyle(2, 0xc8960a));
    this._readyBtn.on('pointerout',  () => this._readyBtn.setStrokeStyle(2, this._ready ? 0xc8960a : 0x8a5a28));

    // 방장 전용 시작 버튼
    this.add.rectangle(cx + 3, cy + panH / 2 - 50, 230, 46, 0x000000, 0.78);
    this._startBtn = this.add.rectangle(cx, cy + panH / 2 - 53, 230, 46, 0x140a04)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x4a2c10);
    this.add.rectangle(cx, cy + panH / 2 - 53 - 19, 222, 2, 0x2a1608, 0.5);
    this._startBtnTxt = this.add.text(cx, cy + panH / 2 - 53, '▶  게임 시작', {
      fontSize: '18px', color: '#4a2c10', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._startBtn.setVisible(false);
    this._startBtnTxt.setVisible(false);
    this._startBtn.on('pointerdown', () => {
      if (this._canStart) this._socket?.startGame();
    });

    // 뒤로가기
    this._makeBtn(cx, H - 22, '← 뒤로', () => {
      this._socket?.disconnect();
      this.scene.start('RoomScene', { nickname: this._data.nickname });
    }, 160, 34);

    this._connectSocket();
  }

  _makeBtn(x, y, label, cb, w = 180, h = 40) {
    const bg = this.add.rectangle(x, y, w, h, 0x140a04)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x6a3c18);
    this.add.text(x, y, label, { fontSize: '14px', color: '#8a5828', fontFamily: 'Georgia, serif' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setStrokeStyle(1, 0xc8960a));
    bg.on('pointerout',  () => bg.setStrokeStyle(1, 0x6a3c18));
    bg.on('pointerdown', cb);
  }

  _connectSocket() {
    try {
      this._socket = new SocketClient(this);

      this.events.on('net:roomCreated', (d) => {
        this._role = 'host';
        this._code = d.code;
        this._codeText.setText(`방코드: ${d.code}`);
        this._statusText.setText('상대방을 기다리는 중...').setColor('#8a5828');
        this._startBtn.setVisible(true);
        this._startBtnTxt.setVisible(true);
      });

      this.events.on('net:roomJoined', (d) => {
        if (d.role) this._role = d.role;
        if (d.code) { this._code = d.code; this._codeText.setText(`방코드: ${d.code}`); }
        if (d.p1) this._hostText.setText(`● 방장: ${d.p1}`);
        if (d.p2) this._guestText.setText(`● 게스트: ${d.p2}`);
        this._statusText.setText(this._role === 'host' ? '방 생성 완료!' : '방 입장 완료!').setColor('#608030');
      });

      this.events.on('net:joinError', (d) => {
        this._statusText.setText(`오류: ${d.msg}`).setColor('#a01808');
      });

      this.events.on('net:readyUpdate', (d) => {
        this._hostText.setColor(d.p1Ready ? '#608030' : '#3a2010');
        this._guestText.setColor(d.p2Ready ? '#608030' : '#3a2010');
        this._canStart = d.p1Ready && d.p2Ready;
        if (this._startBtn.visible) {
          this._startBtn.setFillStyle(this._canStart ? 0x1c2a0a : 0x140a04);
          this._startBtn.setStrokeStyle(2, this._canStart ? 0x8a5a28 : 0x4a2c10);
          this._startBtnTxt.setColor(this._canStart ? '#d4b870' : '#4a2c10');
        }
      });

      this.events.on('net:gameStarting', () => {
        this._statusText.setText('전투 시작!').setColor('#c8960a');
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
        this._statusText.setText('방 생성 중...').setColor('#6a4010');
      } else {
        this._socket.joinRoom(this._data.nickname, this._data.code);
        this._statusText.setText('방 입장 중...').setColor('#6a4010');
      }
    } catch (e) {
      this._statusText.setText('서버 연결 실패 (솔로 모드를 이용해주세요)').setColor('#a01808');
    }
  }

  _toggleReady() {
    this._ready = !this._ready;
    this._socket?.setReady(this._ready);
    this._readyBtn.setFillStyle(this._ready ? 0x1c2a0a : 0x140a04);
    this._readyBtn.setStrokeStyle(2, this._ready ? 0xc8960a : 0x8a5a28);
    this._readyBtnTxt.setText(this._ready ? '✓  Ready!' : 'Ready');
    this._readyBtnTxt.setColor(this._ready ? '#c8960a' : '#d4b870');
  }
}
