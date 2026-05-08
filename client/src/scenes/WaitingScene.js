import { SocketClient } from '../network/SocketClient.js';

export class WaitingScene extends Phaser.Scene {
  constructor() { super('WaitingScene'); }

  create(data) {
    this._data   = data;
    this._socket = null;
    this._role   = null;
    this._code   = data.code || '';
    this._ready  = false;

    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2;

    this.add.rectangle(cx, H / 2, W, H, 0x1a2a2a);

    this._codeText = this.add.text(cx, 80, `방코드: ${this._code || '생성 중...'}`,
      { fontSize: '26px', color: '#f5c842', fontStyle: 'bold' }).setOrigin(0.5);

    this.add.text(cx, 140, '플레이어 상태', { fontSize: '18px', color: '#aaaaaa' }).setOrigin(0.5);
    this._hostText  = this.add.text(cx, 185, '● 방장: 대기 중', { fontSize: '17px', color: '#888888' }).setOrigin(0.5);
    this._guestText = this.add.text(cx, 225, '● 게스트: 대기 중', { fontSize: '17px', color: '#888888' }).setOrigin(0.5);

    this._statusText = this.add.text(cx, 290, '소켓 연결 중...', { fontSize: '14px', color: '#aaaaaa' }).setOrigin(0.5);
    this._countText  = this.add.text(cx, 360, '', { fontSize: '72px', color: '#ffe066', fontStyle: 'bold' }).setOrigin(0.5);

    // Ready 버튼
    this._readyBtn = this.add.rectangle(cx, 440, 180, 46, 0x555555).setInteractive();
    this._readyBtnTxt = this.add.text(cx, 440, 'Ready', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    this._readyBtn.on('pointerdown', () => this._toggleReady());

    // 방장 전용 시작 버튼 (처음엔 숨김)
    this._startBtn = this.add.rectangle(cx, 500, 200, 46, 0x888888).setInteractive();
    this._startBtnTxt = this.add.text(cx, 500, '게임 시작', { fontSize: '20px', color: '#aaaaaa' }).setOrigin(0.5);
    this._startBtn.setVisible(false);
    this._startBtnTxt.setVisible(false);
    this._startBtn.on('pointerdown', () => {
      if (this._canStart) this._socket?.startGame();
    });

    this._makeBtn(cx, H - 50, '← 뒤로가기', 0x444444, () => {
      this._socket?.disconnect();
      this.scene.start('RoomScene', { nickname: this._data.nickname });
    });

    // 소켓 연결
    this._connectSocket();
  }

  _connectSocket() {
    try {
      this._socket = new SocketClient(this);

      this.events.on('net:roomCreated', (d) => {
        this._role = 'host';
        this._code = d.code;
        this._codeText.setText(`방코드: ${d.code}`);
        this._statusText.setText('상대방을 기다리는 중...');
        this._startBtn.setVisible(true);
        this._startBtnTxt.setVisible(true);
      });

      this.events.on('net:roomJoined', (d) => {
        if (d.role) this._role = d.role;
        if (d.code) { this._code = d.code; this._codeText.setText(`방코드: ${d.code}`); }
        if (d.p1) this._hostText.setText(`● 방장: ${d.p1}`);
        if (d.p2) this._guestText.setText(`● 게스트: ${d.p2}`);
        this._statusText.setText(this._role === 'host' ? '방 생성 완료!' : '방 입장 완료!');
      });

      this.events.on('net:joinError', (d) => {
        this._statusText.setText(`오류: ${d.msg}`).setColor('#ff4444');
      });

      this.events.on('net:readyUpdate', (d) => {
        this._hostText.setColor(d.p1Ready ? '#00ff88' : '#888888');
        this._guestText.setColor(d.p2Ready ? '#00ff88' : '#888888');
        this._canStart = d.p1Ready && d.p2Ready;
        if (this._startBtn.visible) {
          this._startBtn.setFillStyle(this._canStart ? 0x3a7d44 : 0x888888);
          this._startBtnTxt.setColor(this._canStart ? '#ffffff' : '#aaaaaa');
        }
      });

      this.events.on('net:gameStarting', () => {
        this._statusText.setText('게임 시작!');
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

      // 방 생성 or 입장
      if (this._data.action === 'create') {
        this._socket.createRoom(this._data.nickname);
        this._statusText.setText('방 생성 중...');
      } else {
        this._socket.joinRoom(this._data.nickname, this._data.code);
        this._statusText.setText('방 입장 중...');
      }
    } catch (e) {
      this._statusText.setText('서버 연결 실패 (솔로 모드를 이용해주세요)').setColor('#ff6666');
    }
  }

  _toggleReady() {
    this._ready = !this._ready;
    this._socket?.setReady(this._ready);
    this._readyBtn.setFillStyle(this._ready ? 0x3a7d44 : 0x555555);
    this._readyBtnTxt.setText(this._ready ? '✓ Ready!' : 'Ready');
  }

  _makeBtn(x, y, label, color, cb) {
    const bg = this.add.rectangle(x, y, 180, 40, color).setInteractive();
    this.add.text(x, y, label, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    bg.on('pointerdown', cb);
  }
}
