// Socket.io 클라이언트 래퍼
export class SocketClient {
  constructor(scene) {
    this._scene  = scene;
    // io() is loaded via CDN script tag in index.html
    if (typeof io === 'undefined') throw new Error('Socket.io CDN not loaded');
    this._socket = io('http://localhost:3000');
    this._bindEvents();
  }

  // ── 송신 ──
  createRoom(nickname)    { this._socket.emit('CREATE_ROOM', { nickname }); }
  joinRoom(nick, code)    { this._socket.emit('JOIN_ROOM', { nickname: nick, code }); }
  setReady(ready)         { this._socket.emit('SET_READY', { ready }); }
  startGame()             { this._socket.emit('START_GAME'); }
  sendCombination(cards)  { this._socket.emit('SEND_COMBINATION', { cards: cards.map(c => c.toJSON()) }); }
  dispatchUnit(unitType)  { this._socket.emit('DISPATCH_UNIT', { unitType }); }
  scoutStart()            { this._socket.emit('SCOUT_START'); }
  kingdomBuild(cards)     { this._socket.emit('KINGDOM_BUILD', { cards: cards.map(c => c.toJSON()) }); }

  // 씬 교체 (WaitingScene → GameScene 전환 시 호출)
  setScene(scene) {
    this._scene = scene;
  }

  // ── 수신 바인딩 ──
  _bindEvents() {
    const s = this._socket;
    const emit = (ev, d) => this._scene.events.emit(ev, d);

    s.on('ROOM_CREATED',  d => emit('net:roomCreated',  d));
    s.on('ROOM_JOINED',   d => emit('net:roomJoined',   d));
    s.on('JOIN_ERROR',    d => emit('net:joinError',    d));
    s.on('READY_UPDATE',  d => emit('net:readyUpdate',  d));
    s.on('GAME_STARTING', () => emit('net:gameStarting'));
    s.on('COUNTDOWN',     d => emit('net:countdown',    d));
    s.on('GAME_START',    () => emit('net:gameStart'));
    s.on('SYNC_STATUS',   d => emit('net:syncStatus',   d));
    s.on('SPAWN_UNIT',    d => emit('net:spawnUnit',    d));
    s.on('SCOUT_REPORT',  d => emit('net:scoutReport',  d));
    s.on('GAME_OVER',     d => emit('net:gameOver',     d));
    s.on('OPPONENT_LEFT', () => emit('net:opponentLeft'));
    s.on('KINGDOM_REJECTED', d => emit('net:kingdomRejected', d));
  }

  disconnect() { this._socket?.disconnect(); }
}
