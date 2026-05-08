import { CardStack } from './CardStack.js';
import { CARD_TYPE } from './CardDefs.js';

function loadBestScore() {
  try {
    return JSON.parse(localStorage.getItem('cardforge_best') || 'null')
      || { combineCount: 0, survivalTime: 0 };
  } catch { return { combineCount: 0, survivalTime: 0 }; }
}

export function createSoloState(nickname) {
  const cards = [
    new CardStack(CARD_TYPE.PERSON,   1, 0.2, 0.5),
    new CardStack(CARD_TYPE.WARRIOR,  1, 0.5, 0.5),
    new CardStack(CARD_TYPE.FARMLAND, 1, 0.8, 0.5),
  ];
  return {
    mode:         'solo',
    nickname,
    survivalTime: 0,
    combineCount: 0,
    cards,
    raidInterval: 60000,
    lastRaidAt:   null,
    bestScore:    loadBestScore(),
  };
}

export function createPvPRoomState(roomId) {
  return {
    roomId,
    players: { p1: null, p2: null },
    status:  'waiting',
    timer:   300,
    lastSync: Date.now(),
  };
}

export function createPvPClientState(nickname, role) {
  const cards = [
    new CardStack(CARD_TYPE.PERSON,   1, 0.2, 0.5),
    new CardStack(CARD_TYPE.WARRIOR,  1, 0.5, 0.5),
    new CardStack(CARD_TYPE.FARMLAND, 1, 0.8, 0.5),
  ];
  return {
    mode:         'pvp',
    nickname,
    role,
    combineCount: 0,
    cards,
    opponentInfo: null,
    scoutInfo:    null,
  };
}
