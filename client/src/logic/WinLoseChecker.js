const POP_TYPES = ['PERSON', 'WARRIOR', 'ARCHER'];

export class WinLoseChecker {
  checkSolo(cards) {
    const pop = cards.filter(c => POP_TYPES.includes(c.type)).reduce((s, c) => s + c.count, 0);
    return pop <= 0 ? 'DEFEAT' : null;
  }

  checkPvP(cards) { return this.checkSolo(cards); }

  saveBestScore(combineCount, survivalTime) {
    const key  = 'cardforge_best';
    const prev = this.loadBestScore();
    const isNew = combineCount > prev.combineCount ||
                 (combineCount === prev.combineCount && survivalTime > prev.survivalTime);
    if (isNew) {
      try { localStorage.setItem(key, JSON.stringify({ combineCount, survivalTime })); }
      catch {}
    }
    return { isNew, prev };
  }

  loadBestScore() {
    try {
      return JSON.parse(localStorage.getItem('cardforge_best') || 'null')
        || { combineCount: 0, survivalTime: 0 };
    } catch { return { combineCount: 0, survivalTime: 0 }; }
  }
}
