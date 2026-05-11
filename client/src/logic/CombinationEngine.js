import { CardStack } from '../models/CardStack.js';

// craftTime 단위: ms. 레시피별로 자유롭게 조정 가능.
const RECIPES = [
  // ── 자연 자원 채집 ──
  { a: 'ROCK',     b: 'PERSON',  consumeA: true,  consumeB: false,
    result: [{ type: 'STONE', count: 2 }], craftTime: 1500 },
  { a: 'TREE',     b: 'PERSON',  consumeA: true,  consumeB: false,
    result: [{ type: 'WOOD',  count: 2 }], craftTime: 1500 },
  { a: 'FARMLAND', b: 'PERSON',  consumeA: false, consumeB: false,
    result: [{ type: 'FOOD',  count: 1 }], farmlandProduce: true, craftTime: 1500 },

  // ── 자연 위협 처치 ──
  { a: 'WOLF',   b: 'WARRIOR', consumeA: true, consumeB: 'prob',
    result: [{ type: 'FOOD', count: 1 }], combatType: 'wolf', craftTime: 3000 },
  { a: 'BEAR',   b: 'WARRIOR', consumeA: true, consumeB: 'prob',
    result: [{ type: 'FOOD', count: 1 }], combatType: 'bear', craftTime: 3000 },

  // ── 자원 생산 ──
  { a: 'STONE', b: 'STONE',    consumeA: true, consumeB: true,
    result: [{ type: 'BRICK', count: 1 }], craftTime: 2000 },
  { a: 'FOOD',  b: 'FOOD',     consumeA: true, consumeB: true,
    result: [{ type: 'SEED',  count: 1 }], craftTime: 2000 },
  { a: 'SEED',  b: 'FARMLAND', consumeA: true, consumeB: true,
    result: [{ type: 'ORCHARD', count: 1 }], craftTime: 2000 },

  // ── 병기 제작 ──
  { a: 'WOOD',  b: 'STONE', consumeA: true, consumeB: true,
    result: [{ type: 'SPEAR', count: 1 }], craftTime: 3000 },
  { a: 'SPEAR', b: 'WOOD',  consumeA: true, consumeB: true,
    result: [{ type: 'BOW',   count: 1 }], craftTime: 3000 },
  { a: 'WOOD',  b: 'WOOD',  consumeA: true, consumeB: true,
    result: [{ type: 'BOAT',  count: 1 }], craftTime: 3000 },

  // ── 인구 생성 ──
  { a: 'PERSON', b: 'FOOD',  consumeA: true, consumeB: true,
    result: [{ type: 'PERSON', count: 2 }], populationCheck: true, craftTime: 4000 },
  { a: 'PERSON', b: 'SPEAR', consumeA: true, consumeB: true,
    result: [{ type: 'WARRIOR', count: 1 }], populationCheck: false, craftTime: 4000 },
  { a: 'BOW',    b: 'PERSON', consumeA: true, consumeB: true,
    result: [{ type: 'ARCHER',  count: 1 }], populationCheck: false, craftTime: 4000 },
  { a: 'WOOD',   b: 'PERSON', consumeA: true, consumeB: true,
    result: [{ type: 'SCOUT',   count: 1 }], populationCheck: false, craftTime: 4000 },

  // ── 건설 ──
  { a: 'BRICK',    b: 'BRICK',    consumeA: true, consumeB: true,
    result: [{ type: 'WALL',     count: 1 }], craftTime: 5000 },
  { a: 'BRICK',    b: 'TREE',     consumeA: true, consumeB: true,
    result: [{ type: 'LOG_HOUSE', count: 1 }], craftTime: 5000 },
  { a: 'LOG_HOUSE', b: 'LOG_HOUSE', consumeA: true, consumeB: true,
    result: [{ type: 'VILLAGE', count: 1 }], craftTime: 5000 },
  { a: 'VILLAGE',  b: 'VILLAGE',  consumeA: true, consumeB: true,
    result: [{ type: 'CITY',    count: 1 }], craftTime: 5000 },

  // ── 공격 유닛 파견 (PvP 전용) ──
  { a: 'WARRIOR', b: 'BOAT', consumeA: true, consumeB: true,
    result: [], dispatchType: 'RAIDER',   pvpOnly: true, craftTime: 2000 },
  { a: 'ARCHER',  b: 'BOAT', consumeA: true, consumeB: true,
    result: [], dispatchType: 'CATAPULT', pvpOnly: true, craftTime: 2000 },
  { a: 'SCOUT',   b: 'BOAT', consumeA: true, consumeB: true,
    result: [], dispatchType: 'SCOUT',    pvpOnly: true, craftTime: 2000 },
];

const POP_TYPES = ['PERSON', 'WARRIOR', 'ARCHER'];

export class CombinationEngine {
  constructor(getState) {
    this._getState = getState;
  }

  findRecipe(typeA, typeB) {
    return RECIPES.find(r =>
      (r.a === typeA && r.b === typeB) ||
      (r.a === typeB && r.b === typeA)
    ) || null;
  }

  combine(stackA, stackB, mode = 'solo') {
    const recipe = this.findRecipe(stackA.type, stackB.type);
    if (!recipe) return { error: '조합 레시피 없음' };
    if (recipe.pvpOnly && mode === 'solo') return { error: 'PvP 전용 조합입니다' };

    if (recipe.populationCheck) {
      const state    = this._getState();
      const popNow   = this._countPop(state.cards);
      const popLimit = this._calcPopLimit(state.cards);
      // 사람+식량: 결과 2명, 재료 2명 소모 → 순증가 1
      const willAdd  = recipe.result.reduce((s, r) =>
        s + (POP_TYPES.includes(r.type) ? r.count : 0), 0);
      const consumed = (recipe.consumeA && POP_TYPES.includes(recipe.a) ? 1 : 0)
                     + (recipe.consumeB && POP_TYPES.includes(recipe.b) ? 1 : 0);
      const netGain  = willAdd - consumed;
      if (popNow + netGain > popLimit)
        return { error: `인구 제한 초과 (${popNow}/${popLimit})` };
    }

    if (recipe.result.some(r => r.type === 'FARMLAND')) {
      const state    = this._getState();
      const farmNow  = state.cards.filter(c => c.type === 'FARMLAND').reduce((s, c) => s + c.count, 0);
      const farmLimit = this._calcFarmLimit(state.cards);
      if (farmNow >= farmLimit) return { error: `농지 제한 초과 (${farmNow}/${farmLimit})` };
    }

    return { recipe, craftTime: recipe.craftTime ?? 1000, ok: true };
  }

  applyRecipe(stackA, stackB, recipe, state) {
    // 정규화: recipe 방향에 맞게 A/B 정렬
    let realA = stackA, realB = stackB;
    if (recipe.a !== stackA.type) { realA = stackB; realB = stackA; }

    const outcome = { specialMode: null, produced: [] };

    // 재료 소모
    if (recipe.consumeA) {
      realA.count -= 1;
      if (realA.count <= 0) state.cards = state.cards.filter(c => c.id !== realA.id);
    }
    if (recipe.consumeB === true) {
      realB.count -= 1;
      if (realB.count <= 0) state.cards = state.cards.filter(c => c.id !== realB.id);
    } else if (recipe.consumeB === 'prob') {
      // 전사 생존 확률 (늑대/곰 처치 시)
      const wolfStrength = recipe.combatType === 'bear' ? 3 : realA.count;
      const warriorCount = realB.count;
      const result = this._resolveWarriorVsWolf(warriorCount, wolfStrength);
      if (result.removed > 0) {
        realB.count -= result.removed;
        if (realB.count <= 0) state.cards = state.cards.filter(c => c.id !== realB.id);
      }
      realA.count = 0;
      state.cards = state.cards.filter(c => c.id !== realA.id);
      outcome.specialMode = 'wolf_combat';
    }

    // 농지 생산 모드
    if (recipe.farmlandProduce) {
      realA.mode = 'producing';
      outcome.specialMode = 'farmland_produce';
    }

    // 파견 유닛
    if (recipe.dispatchType) {
      outcome.specialMode = `dispatch_${recipe.dispatchType.toLowerCase()}`;
    }

    // 결과 카드 생성
    for (const r of recipe.result) {
      // 결과 카드를 stackA 위치 근처에 배치
      const rx = Math.min(0.9, Math.max(0.1, realA.ratioX + (Math.random() - 0.5) * 0.1));
      const ry = Math.min(0.9, Math.max(0.1, realA.ratioY + (Math.random() - 0.5) * 0.1));
      const newStack = new CardStack(r.type, r.count, rx, ry);
      state.cards.push(newStack);
      outcome.produced.push(newStack);
    }

    return outcome;
  }

  _resolveWarriorVsWolf(warriorCount, wolfStrength) {
    if (warriorCount >= wolfStrength) return { removed: 0 };
    const surviveProb = warriorCount / wolfStrength;
    let survived = 0;
    for (let i = 0; i < warriorCount; i++) {
      if (Math.random() < surviveProb) survived++;
    }
    return { removed: warriorCount - survived };
  }

  _countPop(cards) {
    return cards.filter(c => POP_TYPES.includes(c.type)).reduce((s, c) => s + c.count, 0);
  }

  _calcPopLimit(cards) {
    const sum = (type, mult) =>
      cards.filter(c => c.type === type).reduce((s, c) => s + c.count, 0) * mult;
    return 5 + sum('LOG_HOUSE', 1) + sum('VILLAGE', 3) + sum('CITY', 6);
  }

  _calcFarmLimit(cards) {
    const sum = (type, mult) =>
      cards.filter(c => c.type === type).reduce((s, c) => s + c.count, 0) * mult;
    return 1 + sum('VILLAGE', 1) + sum('CITY', 2);
  }

  calcKingdomScore(cards) {
    const city = cards.filter(c => c.type === 'CITY').reduce((s, c) => s + c.count, 0);
    const wall = cards.filter(c => c.type === 'WALL').reduce((s, c) => s + c.count, 0);
    const pop  = this._countPop(cards);
    return city + Math.floor(wall / 10) + Math.floor(pop / 5);
  }
}
