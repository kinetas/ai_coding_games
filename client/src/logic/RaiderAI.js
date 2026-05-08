export class RaiderAI {
  constructor(resolver) {
    this._resolver = resolver;
  }

  tick(stack, cards, dt) {
    if (stack.engagedWith) {
      stack.combatTimer = (stack.combatTimer || 10000) - dt;
      if (stack.combatTimer <= 0) this._resolveCombat(stack, cards);
      return;
    }

    const target = this._findTarget(stack.type, cards);
    if (!target) return;

    const dx   = target.ratioX - stack.ratioX;
    const dy   = target.ratioY - stack.ratioY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 0.04 * (dt / 1000);

    if (dist < 0.06) {
      stack.engagedWith = target.id;
      target.busy       = true;
      stack.combatTimer = 10000;
    } else {
      stack.ratioX += (dx / dist) * speed;
      stack.ratioY += (dy / dist) * speed;
    }
  }

  _findTarget(unitType, cards) {
    const priority = unitType === 'RAIDER'
      ? ['WARRIOR', 'WALL', 'ARCHER', 'PERSON']
      : ['ARCHER', 'WALL', 'WARRIOR', 'PERSON'];

    for (const type of priority) {
      const avail = cards.filter(c => c.type === type && c.count > 0 && !c.busy);
      if (avail.length > 0) return avail[0];
    }
    return null;
  }

  _resolveCombat(stack, cards) {
    const result = stack.type === 'RAIDER'
      ? this._resolver.resolveRaider(cards)
      : this._resolver.resolveCatapult(cards);

    for (const { type, count } of result.removals) {
      this._deductCards(cards, type, count);
    }

    const engaged = cards.find(c => c.id === stack.engagedWith);
    if (engaged) engaged.busy = false;

    stack._toRemove = true;
  }

  _deductCards(cards, type, count) {
    let remaining = count;
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
}
