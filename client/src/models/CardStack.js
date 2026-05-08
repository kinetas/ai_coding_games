let _idCounter = 0;
function generateId() { return `stack-${++_idCounter}-${Date.now()}`; }

export class CardStack {
  constructor(type, count = 1, ratioX = 0.5, ratioY = 0.5) {
    this.id          = generateId();
    this.type        = type;
    this.count       = Math.max(1, count);
    this.ratioX      = ratioX;
    this.ratioY      = ratioY;
    this.expiresAt   = null;   // Date.now() + ms — 늑대/곰/약탈자용
    this.busy        = false;  // 전사가 교전 중인 경우 true
    this.strength    = 1;      // 곰은 3
    this.scoutExpiresAt = null;
    this.engagedWith = null;   // 교전 대상 stack id
    this.combatTimer = 0;
    this._toRemove   = false;
  }

  split(n) {
    const actual = Math.min(n, this.count);
    this.count  -= actual;
    const child  = new CardStack(this.type, actual, this.ratioX + 0.04, this.ratioY + 0.04);
    return child;
  }

  toJSON() {
    return { id: this.id, type: this.type, count: this.count,
             ratioX: this.ratioX, ratioY: this.ratioY };
  }
}
