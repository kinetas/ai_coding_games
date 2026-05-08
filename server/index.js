const express = require('express');
const path    = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app  = express();
const http = createServer(app);
const io   = new Server(http, { cors: { origin: '*' } });

// 클라이언트 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../client')));

const rooms = new Map();  // roomCode → roomState

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function calcKingdomScore(cards) {
  const city = cards.filter(c => c.type === 'CITY').reduce((s, c) => s + c.count, 0);
  const wall = cards.filter(c => c.type === 'WALL').reduce((s, c) => s + c.count, 0);
  const pop  = cards.filter(c => ['PERSON','WARRIOR','ARCHER'].includes(c.type)).reduce((s, c) => s + c.count, 0);
  return city + Math.floor(wall / 10) + Math.floor(pop / 5);
}

function buildSyncPayload(playerState) {
  const cards = playerState.cards || [];
  return {
    pop:          cards.filter(c => ['PERSON','WARRIOR','ARCHER'].includes(c.type)).reduce((s,c) => s+c.count, 0),
    hasWall:      cards.some(c => c.type === 'WALL' && c.count > 0),
    cities:       cards.filter(c => c.type === 'CITY').reduce((s, c) => s + c.count, 0),
    kingdomScore: calcKingdomScore(cards),
  };
}

function buildScoutReport(playerState) {
  const cards = playerState.cards || [];
  return {
    walls:        cards.filter(c=>c.type==='WALL').reduce((s,c)=>s+c.count, 0),
    warriors:     cards.filter(c=>c.type==='WARRIOR').reduce((s,c)=>s+c.count, 0),
    archers:      cards.filter(c=>c.type==='ARCHER').reduce((s,c)=>s+c.count, 0),
    persons:      cards.filter(c=>c.type==='PERSON').reduce((s,c)=>s+c.count, 0),
    food:         cards.filter(c=>c.type==='FOOD').reduce((s,c)=>s+c.count, 0),
    cities:       cards.filter(c=>c.type==='CITY').reduce((s,c)=>s+c.count, 0),
    kingdomScore: calcKingdomScore(cards),
  };
}

function checkGameOver(room, code) {
  const loser = ['p1', 'p2'].find(role => {
    const cards = room[role]?.cards || [];
    const pop = cards.filter(c => ['PERSON','WARRIOR','ARCHER'].includes(c.type)).reduce((s,c) => s+c.count, 0);
    return pop <= 0 && cards.length > 0;
  });
  if (!loser) return;
  room.status = 'ended';
  clearInterval(room.syncInterval);
  const winner = loser === 'p1' ? 'p2' : 'p1';
  io.to(code).emit('GAME_OVER', {
    winner,
    scores: { p1: room.p1?.combineCount || 0, p2: room.p2?.combineCount || 0 },
  });
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let myRole      = null;

  console.log(`[+] ${socket.id} connected`);

  // ── 방 만들기 ──
  socket.on('CREATE_ROOM', ({ nickname }) => {
    const code = genCode();
    const room = {
      code, status: 'waiting',
      p1: { id: socket.id, nickname, ready: false, cards: [], combineCount: 0 },
      p2: null,
      syncInterval: null,
    };
    rooms.set(code, room);
    socket.join(code);
    currentRoom = code;
    myRole = 'p1';
    socket.emit('ROOM_CREATED', { code, role: 'p1' });
    console.log(`[Room] Created ${code} by ${nickname}`);
  });

  // ── 방 참여 ──
  socket.on('JOIN_ROOM', ({ nickname, code }) => {
    const room = rooms.get(code);
    if (!room || room.p2 || room.status !== 'waiting') {
      socket.emit('JOIN_ERROR', { msg: '입장 불가 방입니다' });
      return;
    }
    room.p2 = { id: socket.id, nickname, ready: false, cards: [], combineCount: 0 };
    socket.join(code);
    currentRoom = code;
    myRole = 'p2';
    io.to(code).emit('ROOM_JOINED', { p1: room.p1.nickname, p2: nickname });
    socket.emit('ROOM_JOINED', { code, role: 'p2' });
    console.log(`[Room] ${nickname} joined ${code}`);
  });

  // ── Ready 토글 ──
  socket.on('SET_READY', ({ ready }) => {
    const room = rooms.get(currentRoom);
    if (!room) return;
    room[myRole].ready = ready;
    io.to(currentRoom).emit('READY_UPDATE', {
      p1Ready: room.p1?.ready || false,
      p2Ready: room.p2?.ready || false,
    });
  });

  // ── 게임 시작 (방장만) ──
  socket.on('START_GAME', () => {
    const room = rooms.get(currentRoom);
    if (!room || myRole !== 'p1') return;
    if (!room.p1?.ready || !room.p2?.ready) return;
    room.status = 'countdown';
    io.to(currentRoom).emit('GAME_STARTING');
    let n = 3;
    const cd = setInterval(() => {
      io.to(currentRoom).emit('COUNTDOWN', { n });
      n--;
      if (n < 0) {
        clearInterval(cd);
        room.status = 'playing';
        io.to(currentRoom).emit('GAME_START');
        // 5초마다 상태 동기화 (CLAUDE.md §10.3)
        room.syncInterval = setInterval(() => {
          if (room.p1) io.to(room.p2?.id).emit('SYNC_STATUS', buildSyncPayload(room.p1));
          if (room.p2) io.to(room.p1?.id).emit('SYNC_STATUS', buildSyncPayload(room.p2));
        }, 5000);
      }
    }, 1000);
  });

  // ── 조합 성공 (CLAUDE.md §10.4 SEND_COMBINATION) ──
  socket.on('SEND_COMBINATION', ({ cards }) => {
    const room = rooms.get(currentRoom);
    if (!room) return;
    room[myRole].cards = cards;
    room[myRole].combineCount += 1;
    io.to(currentRoom).emit('COMBINE_UPDATE', {
      role: myRole, combineCount: room[myRole].combineCount,
    });
    checkGameOver(room, currentRoom);
  });

  // ── 유닛 파견 (CLAUDE.md §10.4 SPAWN_RAIDER) ──
  socket.on('DISPATCH_UNIT', ({ unitType }) => {
    const room = rooms.get(currentRoom);
    if (!room || room.status !== 'playing') return;
    const opponent = myRole === 'p1' ? room.p2 : room.p1;
    if (opponent) io.to(opponent.id).emit('SPAWN_UNIT', { unitType });
  });

  // ── 척후병 정찰 (CLAUDE.md §10.4 SCOUT_REPORT) ──
  socket.on('SCOUT_START', () => {
    const room = rooms.get(currentRoom);
    if (!room || room.status !== 'playing') return;
    const opponent = myRole === 'p1' ? room.p2 : room.p1;
    if (!opponent) return;
    let ticks = 0;
    const scoutInt = setInterval(() => {
      ticks++;
      socket.emit('SCOUT_REPORT', buildScoutReport(opponent));
      if (ticks >= 6) clearInterval(scoutInt);  // 6 * 5s = 30s
    }, 5000);
  });

  // ── 왕국 건설 (선착 판정 — 서버 기준, CLAUDE.md §5.5) ──
  socket.on('KINGDOM_BUILD', ({ cards }) => {
    const room = rooms.get(currentRoom);
    if (!room || room.status !== 'playing') return;
    const score = calcKingdomScore(cards);
    if (score < 30) {
      socket.emit('KINGDOM_REJECTED', { msg: '왕국 점수 30점 미만' });
      return;
    }
    room.status = 'ended';
    clearInterval(room.syncInterval);
    io.to(currentRoom).emit('GAME_OVER', {
      winner: myRole,
      scores: { p1: room.p1?.combineCount || 0, p2: room.p2?.combineCount || 0 },
    });
  });

  // ── 연결 해제 ──
  socket.on('disconnect', () => {
    const room = rooms.get(currentRoom);
    if (!room) return;
    clearInterval(room.syncInterval);
    if (room.status === 'playing') {
      io.to(currentRoom).emit('OPPONENT_LEFT');
    }
    rooms.delete(currentRoom);
    console.log(`[-] ${socket.id} disconnected (room: ${currentRoom})`);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`CardForge Server running on http://localhost:${PORT}`);
});
