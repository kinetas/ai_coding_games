import { CardStack } from '../models/CardStack.js';

// craftTime 단위: ms.
const RECIPES = [
  // ── 자연 자원 채집 ──
  // 바위는 스폰 후 소모 → 계속 찾아야 함. 5초는 초반 흐름을 과도하게 막음.
  { a: 'ROCK',     b: 'PERSON',  consumeA: true,  consumeB: false,
    result: [{ type: 'STONE', count: 2 }], craftTime: 3500 },
  // 목재는 거의 모든 조합의 기초 재료. 동일 이유로 단축.
  { a: 'TREE',     b: 'PERSON',  consumeA: true,  consumeB: false,
    result: [{ type: 'WOOD',  count: 2 }], craftTime: 3500 },
  // 두 카드 모두 비소모(무한 사이클). 짧으면 식량이 넘쳐 인구 조합이 너무 쉬워짐.
  { a: 'FARMLAND', b: 'PERSON',  consumeA: false, consumeB: false,
    result: [{ type: 'FOOD',  count: 1 }], farmlandProduce: true, craftTime: 7000 },

  // ── 자연 위협 처치 ──
  // 늑대는 20초 타이머. 5초 교전이면 전사 배치 결정 시간 포함 너무 빡빡함.
  { a: 'WOLF',   b: 'WARRIOR', consumeA: true, consumeB: 'prob',
    result: [{ type: 'FOOD', count: 1 }], combatType: 'wolf', craftTime: 3000 },
  // 곰은 늑대 3마리 동급 위협. 긴 교전이 위험감을 전달함.
  { a: 'BEAR',   b: 'WARRIOR', consumeA: true, consumeB: 'prob',
    result: [{ type: 'FOOD', count: 1 }], combatType: 'bear', craftTime: 8000 },

  // ── 자원 생산 ──
  // 벽돌은 성벽·건물 모든 건설의 핵심 재료. 2초는 스팸 허용 → 건설 전략 선택이 사라짐.
  { a: 'STONE', b: 'STONE',    consumeA: true, consumeB: true,
    result: [{ type: 'BRICK', count: 1 }], craftTime: 4500 },

  // ── 병기 제작 ──
  // 창: 전사의 첫 관문. 기준 속도.
  { a: 'WOOD',  b: 'STONE', consumeA: true, consumeB: true,
    result: [{ type: 'SPEAR', count: 1 }], craftTime: 3000 },
  // 활: 창보다 정밀한 복합 병기(2단계 조합). 궁수는 자동 방어라 대량 생산 시 공략 불가 → 병목 필요.
  { a: 'SPEAR', b: 'WOOD',  consumeA: true, consumeB: true,
    result: [{ type: 'BOW',   count: 1 }], craftTime: 4500 },
  // 배: PvP 파견의 핵심 관문 재료. 파견 준비에 실질적 비용 부여.
  { a: 'WOOD',  b: 'WOOD',  consumeA: true, consumeB: true,
    result: [{ type: 'BOAT',  count: 1 }], craftTime: 5000 },

  // ── 인구 생성 ──
  // 순증가 +1 사이클. 5초면 인구 제한 설계가 무의미해짐 → 건물 투자 동기 유지.
  { a: 'PERSON', b: 'FOOD',  consumeA: true, consumeB: true,
    result: [{ type: 'PERSON', count: 2 }], populationCheck: true, craftTime: 6500 },
  // 전사는 유일한 선제공격 유닛. 빠른 대량 생산 시 PvP 균형 붕괴.
  { a: 'PERSON', b: 'SPEAR', consumeA: true, consumeB: true,
    result: [{ type: 'WARRIOR', count: 1 }], populationCheck: false, craftTime: 5500 },
  // 궁수는 자동 방어(3명 = 약탈자 1처리). 빠른 양산 시 공격 무력화.
  { a: 'BOW',    b: 'PERSON', consumeA: true, consumeB: true,
    result: [{ type: 'ARCHER',  count: 1 }], populationCheck: false, craftTime: 5500 },
  // 척후병은 비전투 정찰 유닛. 빠른 파견을 장려해 정보 플레이 가치 부여.
  { a: 'WOOD',   b: 'PERSON', consumeA: true, consumeB: true,
    result: [{ type: 'SCOUT',   count: 1 }], populationCheck: false, craftTime: 2500 },

  // ── 건설 ──
  // 성벽은 방어 기본 단위(카드 1장 = 체력 1). 벽돌 생산(4.5초)이 병목이므로 조합 자체는 빠르게.
  { a: 'BRICK',    b: 'BRICK',    consumeA: true, consumeB: true,
    result: [{ type: 'WALL',     count: 1 }], craftTime: 3000 },
  // 인구 제한 +1의 첫 번째 건물. 기준 투자 비용.
  { a: 'BRICK',    b: 'TREE',     consumeA: true, consumeB: true,
    result: [{ type: 'LOG_HOUSE', count: 1 }], craftTime: 5000 },
  // 마을은 인구 +3·농지 +1의 큰 업그레이드. 두 채 합치는 공사는 무거운 투자여야 함.
  { a: 'LOG_HOUSE', b: 'LOG_HOUSE', consumeA: true, consumeB: true,
    result: [{ type: 'VILLAGE', count: 1 }], craftTime: 6000 },
  // 도시는 왕국 점수 직접 기여(+1). 10분 내 왕국 건설 승리가 현실적이도록 조정.
  { a: 'VILLAGE',  b: 'VILLAGE',  consumeA: true, consumeB: true,
    result: [{ type: 'CITY',    count: 1 }], craftTime: 10000 },

  // ── 공격 유닛 파견 (PvP 전용) ──
  // 2초는 너무 즉각적. 3.5초로 상대 최소 반응 기회 확보.
  { a: 'WARRIOR', b: 'BOAT', consumeA: true, consumeB: true,
    result: [], dispatchType: 'RAIDER',   pvpOnly: true, craftTime: 3500 },
  // 투석기는 약탈자보다 강한 포위 병기(궁수 1:1 처리). 긴 준비시간으로 차별화.
  { a: 'ARCHER',  b: 'BOAT', consumeA: true, consumeB: true,
    result: [], dispatchType: 'CATAPULT', pvpOnly: true, craftTime: 5000 },
  // 정찰은 비전투 행동. 빠른 파견이 정보전의 핵심이므로 유지.
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
      // 결과 인구 - 소모 인구 = 순증가. > (not >=): 제한까지는 도달 허용, 초과만 차단
      const willAdd  = recipe.result.reduce((s, r) =>
        s + (POP_TYPES.includes(r.type) ? r.count : 0), 0);
      const consumed = (recipe.consumeA && POP_TYPES.includes(recipe.a) ? 1 : 0)
                     + (recipe.consumeB && POP_TYPES.includes(recipe.b) ? 1 : 0);
      const netGain  = willAdd - consumed;
      if (popNow + netGain > popLimit)
        return { error: `인구 제한 초과 (${popNow}/${popLimit})` };
    }

    if (recipe.result.some(r => r.type === 'FARMLAND')) {
      const state     = this._getState();
      const farmNow   = state.cards.filter(c => c.type === 'FARMLAND').reduce((s, c) => s + c.count, 0);
      const farmLimit = this._calcFarmLimit(state.cards);
      const farmAdded = recipe.result.filter(r => r.type === 'FARMLAND').reduce((s, r) => s + r.count, 0);
      if (farmNow + farmAdded > farmLimit) return { error: `농지 제한 초과 (${farmNow}/${farmLimit})` };
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
        realB.count = Math.max(0, realB.count - result.removed);
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
