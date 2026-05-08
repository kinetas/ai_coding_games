import { CardStack } from '../models/CardStack.js';

const SPAWN_CONFIG = {
  ROCK: { minInterval: 40000, maxInterval: 80000, maxOnBoard: 3 },
  TREE: { minInterval: 40000, maxInterval: 80000, maxOnBoard: 3 },
  WOLF: { minInterval: 60000, maxInterval: 120000, maxOnBoard: 4, maxCount: 3 },
  BEAR: { minInterval: 150000, maxInterval: 300000, maxOnBoard: 1 },
};

export class SpawnManager {
  constructor(onSpawn) {
    this._onSpawn = onSpawn;
    this._timers  = {};
  }

  start() {
    for (const [type, cfg] of Object.entries(SPAWN_CONFIG)) {
      this._timers[type] = Date.now() + this._rand(cfg.minInterval, cfg.maxInterval);
    }
  }

  update(dt, cards) {
    const now = Date.now();
    for (const [type, cfg] of Object.entries(SPAWN_CONFIG)) {
      if (now < this._timers[type]) continue;

      const onBoard = cards.filter(c => c.type === type).reduce((s, c) => s + c.count, 0);
      if (onBoard >= cfg.maxOnBoard) {
        this._timers[type] = now + this._rand(cfg.minInterval, cfg.maxInterval);
        continue;
      }

      let count = 1;
      if (type === 'WOLF') count = Math.floor(Math.random() * 3) + 1;

      this._onSpawn(type, count);
      this._timers[type] = now + this._rand(cfg.minInterval, cfg.maxInterval);
    }
  }

  _rand(min, max) { return min + Math.random() * (max - min); }
}

export class RaiderSpawner {
  constructor(onSpawn) {
    this._onSpawn  = onSpawn;
    this._interval = 60000;
    this._minInt   = 20000;
    this._nextAt   = Date.now() + this._interval;
  }

  update() {
    if (Date.now() < this._nextAt) return;
    this._onSpawn('RAIDER', 1);
    this._interval = Math.max(this._minInt, this._interval - 30000);
    this._nextAt   = Date.now() + this._interval;
  }
}

export function createThreatCard(type, count) {
  const rx = 0.1 + Math.random() * 0.8;
  const ry = 0.1 + Math.random() * 0.4;
  const stack = new CardStack(type, count, rx, ry);
  stack.expiresAt = Date.now() + 20000;
  if (type === 'BEAR') stack.strength = 3;
  return stack;
}

export function applyRaid(cards, strength) {
  const wallStacks   = cards.filter(c => c.type === 'WALL');
  const archerStacks = cards.filter(c => c.type === 'ARCHER');
  const personStacks = cards.filter(c => c.type === 'PERSON');
  const hasWall  = wallStacks.reduce((s, c) => s + c.count, 0) > 0;
  const hasArch  = archerStacks.reduce((s, c) => s + c.count, 0) > 0;

  const produced = [];

  if (hasWall && hasArch) {
    deductCards(cards, 'WALL', 1);
    for (let i = 0; i < strength; i++) {
      const rx = 0.2 + Math.random() * 0.6;
      const ry = 0.3 + Math.random() * 0.4;
      cards.push(new CardStack('FOOD', 1, rx, ry));
    }
  } else if (hasArch) {
    deductCards(cards, 'ARCHER', strength);
    for (let i = 0; i < strength; i++) {
      cards.push(new CardStack('FOOD', 1, 0.3 + Math.random() * 0.4, 0.4 + Math.random() * 0.2));
    }
  } else if (hasWall) {
    deductCards(cards, 'PERSON', strength);
  } else {
    deductCards(cards, 'PERSON', strength);
  }
}

export function deductCards(cards, type, amount) {
  let remaining = amount;
  for (const card of cards.filter(c => c.type === type)) {
    const take = Math.min(card.count, remaining);
    card.count -= take;
    remaining  -= take;
    if (remaining <= 0) break;
  }
  for (let i = cards.length - 1; i >= 0; i--) {
    if (cards[i].count <= 0) cards.splice(i, 1);
  }
}
