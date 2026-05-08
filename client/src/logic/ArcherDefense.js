export class ArcherDefense {
  tick(cards) {
    const archers = cards.filter(c => c.type === 'ARCHER').reduce((s, c) => s + c.count, 0);
    if (archers <= 0) return;

    const enemies = cards.filter(c => ['RAIDER', 'CATAPULT'].includes(c.type) && !c.engagedWith && !c.busy);
    for (const enemy of enemies) {
      const result = enemy.type === 'RAIDER'
        ? this._vsRaider(cards, archers)
        : this._vsCatapult(archers);

      for (const { type, count } of result.removals) {
        this._deduct(cards, type, count);
      }
      if (result.enemyKilled) enemy._toRemove = true;
    }
  }

  _vsRaider(cards, archerCount) {
    const hasWall = cards.some(c => c.type === 'WALL' && c.count > 0);
    if (hasWall) {
      return { removals: [{ type: 'WALL', count: 1 }], enemyKilled: true };
    }
    const needed = Math.min(3, archerCount);
    return { removals: [{ type: 'ARCHER', count: needed }], enemyKilled: archerCount >= 3 };
  }

  _vsCatapult(archerCount) {
    return { removals: [{ type: 'ARCHER', count: 1 }], enemyKilled: true };
  }

  _deduct(cards, type, count) {
    let rem = count;
    for (const c of cards.filter(x => x.type === type)) {
      const take = Math.min(c.count, rem);
      c.count -= take;
      rem     -= take;
      if (rem <= 0) break;
    }
    for (let i = cards.length - 1; i >= 0; i--) {
      if (cards[i].count <= 0) cards.splice(i, 1);
    }
  }
}
