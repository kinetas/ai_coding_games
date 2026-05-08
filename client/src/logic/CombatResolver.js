export class CombatResolver {
  resolveRaider(cards) {
    const wallCount   = this._count(cards, 'WALL');
    const archerCount = this._count(cards, 'ARCHER');
    const hasWall     = wallCount > 0;
    const hasArcher   = archerCount > 0;

    // 성벽 흡수: 궁수 존재 시 1장만 깎임 (§5.7)
    if (hasWall) {
      const wallDmg = hasArcher ? 1 : 2;
      return {
        removals: [{ type: 'WALL', count: Math.min(wallDmg, wallCount) }],
        unitSurvives: false,
      };
    }

    // 성벽 없을 때 우선순위: 전사→궁수→사람
    const priority = [
      { target: 'WARRIOR', ratio: 2 },
      { target: 'ARCHER',  ratio: 3 },
      { target: 'PERSON',  ratio: 5 },
    ];
    return this._resolveByPriority(cards, priority);
  }

  resolveCatapult(cards) {
    // 투석기 우선순위: 궁수→성벽→전사→사람 (§5.7)
    const wallCount = this._count(cards, 'WALL');
    if (wallCount > 0) {
      return { removals: [{ type: 'WALL', count: Math.min(3, wallCount) }], unitSurvives: false };
    }
    const priority = [
      { target: 'ARCHER',  ratio: 1 },
      { target: 'WARRIOR', ratio: 2 },
      { target: 'PERSON',  ratio: 5 },
    ];
    return this._resolveByPriority(cards, priority);
  }

  resolveWarriorVsWolf(warriorCount, wolfStrength) {
    if (warriorCount >= wolfStrength) return { removed: 0 };
    const surviveProb = warriorCount / wolfStrength;
    let survived = 0;
    for (let i = 0; i < warriorCount; i++) {
      if (Math.random() < surviveProb) survived++;
    }
    return { removed: warriorCount - survived };
  }

  _resolveByPriority(cards, priority) {
    const removals = [];
    let remaining = 1;
    for (const { target, ratio } of priority) {
      if (remaining <= 0) break;
      const avail = this._count(cards, target);
      if (avail <= 0) continue;
      const needed = remaining * ratio;
      const actual = Math.min(needed, avail);
      removals.push({ type: target, count: actual });
      remaining -= Math.floor(actual / ratio);
    }
    return { removals, unitSurvives: remaining > 0 };
  }

  _count(cards, type) {
    return cards.filter(c => c.type === type).reduce((s, c) => s + c.count, 0);
  }
}
