// ═══════════════════════════════════════════
//  CARD DEFINITIONS
// ═══════════════════════════════════════════
var CARD_DEFS = {
  // ── Human ──
  person: {
    name: '사람', icon: '\u{1F464}', category: 'human',
    removalTime: 300, categoryLabel: '인류'
  },
  warrior: {
    name: '전사', icon: '\u2694\uFE0F', category: 'human',
    removalTime: 300, categoryLabel: '인류'
  },

  // ── Building ──
  farmland: {
    name: '농지', icon: '\u{1F33E}', category: 'building',
    removalTime: 60, workTime: 15, workerType: 'person',
    workResult: { resources: ['food'], resetRemoval: true },
    expiryResult: 'ruined_farmland', categoryLabel: '건설'
  },
  ruined_farmland: {
    name: '망한 농지', icon: '\u{1F940}', category: 'building',
    removalTime: 60, workTime: 30, workerType: 'person',
    workResult: { transform: 'farmland' },
    expiryResult: 'land', categoryLabel: '건설'
  },
  land: {
    name: '영지', icon: '\u{1F3D4}\uFE0F', category: 'building',
    removalTime: null, workTime: 30, workerType: 'person',
    workResult: { transform: 'farmland' },
    categoryLabel: '건설'
  },
  boat: {
    name: '배', icon: '\u26F5', category: 'building',
    removalTime: 300, workTime: 60, workerType: 'person',
    workResult: { randomResources: 5, resetRemoval: true },
    categoryLabel: '건설'
  },
  wall: {
    name: '성벽', icon: '\u{1F3F0}', category: 'building',
    removalTime: null, categoryLabel: '건설'
  },

  // ── Nature (positive) ──
  rock: {
    name: '바위', icon: '\u26F0\uFE0F', category: 'nature',
    removalTime: 300, workTime: 60, workerType: 'person',
    workResult: { resources: ['stone', 'stone'], destroySelf: true },
    categoryLabel: '자연'
  },
  tree: {
    name: '나무', icon: '\u{1F332}', category: 'nature',
    removalTime: 300, workTime: 60, workerType: 'person',
    workResult: { resources: ['wood', 'wood'], destroySelf: true },
    categoryLabel: '자연'
  },
  rabbit: {
    name: '토끼', icon: '\u{1F407}', category: 'nature',
    removalTime: 180, workTime: 10, workerType: 'warrior',
    workResult: { resources: ['food'], destroySelf: true },
    categoryLabel: '자연'
  },
  deer: {
    name: '사슴', icon: '\u{1F98C}', category: 'nature',
    removalTime: 300, workTime: 30, workerType: 'warrior',
    workResult: { resources: ['food', 'food'], destroySelf: true },
    categoryLabel: '자연'
  },

  // ── Nature (negative) ──
  wolf: {
    name: '늑대', icon: '\u{1F43A}', category: 'nature', negative: true,
    removalTime: 60, workTime: 30, workerType: 'warrior',
    workResult: { resources: ['food', 'food'], destroySelf: true, workerDeathChance: 0.15 },
    expiryDamage: 1, categoryLabel: '위협'
  },
  bear: {
    name: '곰', icon: '\u{1F43B}', category: 'nature', negative: true,
    removalTime: 60, workTime: 30, workerType: 'warrior',
    workResult: { resources: ['food', 'food', 'food'], destroySelf: true, workerDeathChance: 0.3 },
    expiryDamage: 3, categoryLabel: '위협'
  },

  // ── Weapon ──
  spear: {
    name: '창', icon: '\u{1F5E1}\uFE0F', category: 'weapon',
    categoryLabel: '무기'
  },

  // ── Resource ──
  food:  { name: '식량', icon: '\u{1F35E}', category: 'resource', categoryLabel: '재화' },
  stone: { name: '돌',   icon: '\u{1FAA8}', category: 'resource', categoryLabel: '재화' },
  wood:  { name: '목재', icon: '\u{1FAB5}', category: 'resource', categoryLabel: '재화' },
  brick: { name: '벽돌', icon: '\u{1F9F1}', category: 'resource', categoryLabel: '재화' }
};

// ═══════════════════════════════════════════
//  COMBINATIONS & SPAWN CONFIG
// ═══════════════════════════════════════════
var COMBINATIONS = [
  { a: 'stone', b: 'stone', result: 'brick' },
  { a: 'brick', b: 'brick', result: 'wall' },
  { a: 'wood',  b: 'stone', result: 'spear' },
  { a: 'wood',  b: 'wood',  result: 'boat' }
];

var SPAWN_CONFIG = {
  rock:   { min: 40,  max: 80,  cap: 3, initial: 30 },
  tree:   { min: 40,  max: 80,  cap: 3, initial: 30 },
  rabbit: { min: 50,  max: 100, cap: 3, initial: 45 },
  deer:   { min: 70,  max: 140, cap: 2, initial: 60 },
  wolf:   { min: 100, max: 200, cap: 2, initial: 100 },
  bear:   { min: 150, max: 300, cap: 1, initial: 180 }
};

var RANDOM_RESOURCE_POOL = ['food', 'stone', 'wood'];

// ═══════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════
var CARD_W = 130, CARD_H = 180;
var cards = [];
var nextId = 1;
var gameSpeed = 1;
var topZ = 10;
var dragState = null;
var highlightTarget = null;
var canvas, logEl;
var gameTime = 0;
var spawnTimers = {};

// ═══════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════
function init() {
  canvas = document.getElementById('game-canvas');
  logEl = document.getElementById('log-entries');
  setupEventListeners();
  initSpawns();
  spawnInitialCards();
  requestAnimationFrame(gameLoop);
  log('\u{1F3F0} 게임이 시작되었습니다!');
  log('\u{1F4A1} 사람을 농지에 놓아 식량을 생산하세요');
}

function spawnInitialCards() {
  var cr = canvas.getBoundingClientRect();
  var cw = Math.max(cr.width, 600);
  var ch = Math.max(cr.height, 400);
  createCard('person', cw * 0.08, ch * 0.15);
  createCard('person', cw * 0.08, ch * 0.42);
  createCard('person', cw * 0.08, ch * 0.69);
  createCard('farmland', cw * 0.42 - CARD_W / 2, ch * 0.38);
}

function initSpawns() {
  for (var type in SPAWN_CONFIG) {
    spawnTimers[type] = SPAWN_CONFIG[type].initial;
  }
}

// ═══════════════════════════════════════════
//  CARD CRUD
// ═══════════════════════════════════════════
function createCard(type, x, y, animate) {
  if (animate === undefined) animate = true;
  var def = CARD_DEFS[type];
  var card = {
    id: nextId++,
    type: type,
    x: x, y: y,
    removalTimeLeft: def.removalTime || null,
    removalTimeMax: def.removalTime || null,
    workTimeLeft: 0,
    workTimeMax: def.workTime || null,
    isWorking: false,
    storedWorker: null,
    visible: true,
    hp: (type === 'wall') ? 5 : null,
    element: null
  };
  card.element = buildCardDOM(card);
  canvas.appendChild(card.element);
  cards.push(card);
  if (animate) {
    card.element.classList.add('spawning');
    setTimeout(function() { card.element.classList.remove('spawning'); }, 350);
  }
  updateCardCount();
  return card;
}

function removeCard(card, animate) {
  if (animate === undefined) animate = true;
  card.visible = false;
  if (animate) {
    card.element.classList.add('dying');
    var el = card.element;
    var id = card.id;
    setTimeout(function() {
      if (el.parentNode) el.parentNode.removeChild(el);
      cards = cards.filter(function(c) { return c.id !== id; });
      updateCardCount();
    }, 600);
  } else {
    if (card.element.parentNode) card.element.parentNode.removeChild(card.element);
    cards = cards.filter(function(c) { return c.id !== card.id; });
    updateCardCount();
  }
}

function transformCard(card, newType) {
  var def = CARD_DEFS[newType];
  card.type = newType;
  card.removalTimeLeft = def.removalTime || null;
  card.removalTimeMax = def.removalTime || null;
  card.workTimeMax = def.workTime || null;
  card.workTimeLeft = 0;
  card.isWorking = false;
  card.storedWorker = null;
  if (newType === 'wall') card.hp = 5;

  var oldEl = card.element;
  card.element = buildCardDOM(card);
  card.element.classList.add('spawning');
  setTimeout(function() { card.element.classList.remove('spawning'); }, 350);
  canvas.replaceChild(card.element, oldEl);
}

// ═══════════════════════════════════════════
//  CARD DOM
// ═══════════════════════════════════════════
function buildCardDOM(card) {
  var def = CARD_DEFS[card.type];
  var cat = def.category;

  var el = document.createElement('div');
  el.className = 'card card-' + cat;
  if (def.negative) el.classList.add('negative');
  el.dataset.id = card.id;
  el.style.left = card.x + 'px';
  el.style.top = card.y + 'px';
  el.style.zIndex = topZ;

  var badge = document.createElement('span');
  badge.className = 'card-badge badge-' + cat;
  badge.textContent = def.categoryLabel;
  el.appendChild(badge);

  var icon = document.createElement('div');
  icon.className = 'card-icon';
  icon.textContent = def.icon;
  el.appendChild(icon);

  var name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = def.name;
  el.appendChild(name);

  // Worker indicator (for workable cards)
  if (def.workTime) {
    var worker = document.createElement('div');
    worker.className = 'worker-indicator';
    worker.style.display = 'none';
    el.appendChild(worker);
  }

  // Wall HP display
  if (card.type === 'wall') {
    var hpDiv = document.createElement('div');
    hpDiv.className = 'card-hp';
    hpDiv.innerHTML = '<span class="hp-icon">\u2764\uFE0F</span><span class="hp-value">' + card.hp + '</span>';
    el.appendChild(hpDiv);
  }

  // Timer bars
  var timers = document.createElement('div');
  timers.className = 'card-timers';

  if (def.removalTime) {
    var row = document.createElement('div');
    row.className = 'timer-row removal-row';
    row.innerHTML =
      '<span class="timer-icon">\u23F3</span>' +
      '<div class="timer-bar-bg"><div class="timer-fill fill-removal" style="width:100%"></div></div>' +
      '<span class="timer-text removal-text">' + formatTime(card.removalTimeLeft) + '</span>';
    timers.appendChild(row);
  }

  if (def.workTime) {
    var wrow = document.createElement('div');
    wrow.className = 'timer-row work-row';
    wrow.style.display = 'none';
    wrow.innerHTML =
      '<span class="timer-icon">\u2692\uFE0F</span>' +
      '<div class="timer-bar-bg"><div class="timer-fill fill-work" style="width:0%"></div></div>' +
      '<span class="timer-text work-text">0:00</span>';
    timers.appendChild(wrow);
  }

  el.appendChild(timers);
  return el;
}

function updateCardDOM(card) {
  var def = CARD_DEFS[card.type];
  var el = card.element;
  if (!el || !card.visible) return;

  el.style.left = card.x + 'px';
  el.style.top = card.y + 'px';

  // Removal timer
  if (def.removalTime && card.removalTimeMax) {
    var pct = Math.max(0, (card.removalTimeLeft / card.removalTimeMax) * 100);
    var fill = el.querySelector('.fill-removal');
    var text = el.querySelector('.removal-text');
    if (fill) {
      fill.style.width = pct + '%';
      if (pct < 20) fill.classList.add('low');
      else fill.classList.remove('low');
    }
    if (text) text.textContent = formatTime(card.removalTimeLeft);
  }

  // Work timer
  if (def.workTime && card.isWorking) {
    var wrow = el.querySelector('.work-row');
    if (wrow) {
      wrow.style.display = 'flex';
      var wp = Math.max(0, ((card.workTimeMax - card.workTimeLeft) / card.workTimeMax) * 100);
      var wf = el.querySelector('.fill-work');
      var wt = el.querySelector('.work-text');
      if (wf) wf.style.width = wp + '%';
      if (wt) wt.textContent = formatTime(card.workTimeLeft);
    }
    if (!el.classList.contains('working')) el.classList.add('working');
  } else {
    var wr2 = el.querySelector('.work-row');
    if (wr2) wr2.style.display = 'none';
    el.classList.remove('working');
  }

  // Worker indicator
  if (def.workTime) {
    var wi = el.querySelector('.worker-indicator');
    if (wi) {
      if (card.storedWorker) {
        wi.style.display = 'block';
        wi.textContent = CARD_DEFS[card.storedWorker.type].icon;
      } else {
        wi.style.display = 'none';
      }
    }
  }

  // Wall HP
  if (card.type === 'wall') {
    var hpVal = el.querySelector('.hp-value');
    if (hpVal) hpVal.textContent = card.hp;
  }
}

// ═══════════════════════════════════════════
//  GAME LOOP
// ═══════════════════════════════════════════
var lastTimestamp = 0;

function gameLoop(timestamp) {
  if (lastTimestamp === 0) lastTimestamp = timestamp;
  var rawDt = (timestamp - lastTimestamp) / 1000;
  var dt = Math.min(rawDt, 0.1) * gameSpeed;
  lastTimestamp = timestamp;
  gameTime += dt;

  update(dt);
  updateSpawns(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  var snapshot = cards.slice();
  for (var i = 0; i < snapshot.length; i++) {
    var card = snapshot[i];
    if (!card.visible || !cards.includes(card)) continue;

    // Removal timer
    if (card.removalTimeLeft !== null && card.removalTimeLeft > 0) {
      card.removalTimeLeft -= dt;
      if (card.removalTimeLeft <= 0) {
        card.removalTimeLeft = 0;
        handleRemovalExpiry(card);
        continue;
      }
    }

    // Work timer
    if (card.isWorking && card.workTimeLeft > 0) {
      card.workTimeLeft -= dt;

      // Stored worker timer keeps ticking (human cards always tick)
      if (card.storedWorker && card.storedWorker.removalTimeLeft !== null) {
        card.storedWorker.removalTimeLeft -= dt;
        if (card.storedWorker.removalTimeLeft <= 0) {
          card.storedWorker.removalTimeLeft = 0;
          log('\u{1F480} ' + CARD_DEFS[card.storedWorker.type].name + '이(가) 작업 중 사망했습니다');
          card.storedWorker = null;
        }
      }

      if (card.workTimeLeft <= 0) {
        card.workTimeLeft = 0;
        handleWorkComplete(card);
      }
    }
  }
}

function render() {
  for (var i = 0; i < cards.length; i++) {
    updateCardDOM(cards[i]);
  }
}

// ═══════════════════════════════════════════
//  NATURAL SPAWNING
// ═══════════════════════════════════════════
function updateSpawns(dt) {
  for (var type in SPAWN_CONFIG) {
    spawnTimers[type] -= dt;
    if (spawnTimers[type] <= 0) {
      var cfg = SPAWN_CONFIG[type];
      var count = 0;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].visible && cards[i].type === type) count++;
      }
      if (count < cfg.cap) {
        spawnNatureCard(type);
      }
      spawnTimers[type] = cfg.min + Math.random() * (cfg.max - cfg.min);
    }
  }
}

function spawnNatureCard(type) {
  var cr = canvas.getBoundingClientRect();
  var margin = 30;
  var x = margin + Math.random() * (cr.width - CARD_W - margin * 2);
  var y = margin + Math.random() * (cr.height - CARD_H - margin * 2);
  createCard(type, x, y);
  var def = CARD_DEFS[type];
  if (def.negative) {
    log('\u26A0\uFE0F ' + def.icon + ' ' + def.name + '이(가) 나타났습니다!', true);
  } else {
    log('\u{1F33F} ' + def.icon + ' ' + def.name + '이(가) 나타났습니다');
  }
}

// ═══════════════════════════════════════════
//  TIMER HANDLERS
// ═══════════════════════════════════════════
function ejectWorker(card) {
  if (!card.storedWorker) return;
  var w = card.storedWorker;
  if (w.removalTimeLeft > 0) {
    var ejected = createCard(w.type, card.x + CARD_W + 10, card.y);
    ejected.removalTimeLeft = w.removalTimeLeft;
    ejected.removalTimeMax = w.removalTimeMax;
    log('\u26A0\uFE0F ' + CARD_DEFS[w.type].name + '이(가) 돌아왔습니다');
  }
  card.storedWorker = null;
  card.isWorking = false;
}

function handleRemovalExpiry(card) {
  var def = CARD_DEFS[card.type];

  if (def.category === 'human') {
    log('\u{1F480} ' + def.name + '이(가) 사망했습니다!');
    removeCard(card);
    return;
  }

  if (def.category === 'building') {
    if (def.expiryResult) {
      var newDef = CARD_DEFS[def.expiryResult];
      log('\u{1F504} ' + def.name + ' \u2192 ' + newDef.name);
      ejectWorker(card);
      transformCard(card, def.expiryResult);
    } else {
      ejectWorker(card);
      log('\u{1F4A8} ' + def.name + '이(가) 사라졌습니다');
      removeCard(card);
    }
    return;
  }

  if (def.category === 'nature') {
    if (def.negative && def.expiryDamage) {
      if (card.storedWorker) {
        ejectWorker(card);
        log('\u{1F4A8} ' + def.name + '을(를) 쫓아냈습니다');
      } else {
        log('\u{1F4A5} ' + def.name + '이(가) 피해를 입혔습니다!', true);
        applyNegativeDamage(def.expiryDamage);
      }
    } else {
      ejectWorker(card);
      log('\u{1F343} ' + def.name + '이(가) 사라졌습니다');
    }
    removeCard(card);
    return;
  }
}

function handleWorkComplete(card) {
  var def = CARD_DEFS[card.type];
  var result = def.workResult;
  if (!result) return;
  card.isWorking = false;

  // Spawn specific resources
  var allRes = [];
  if (result.resources) {
    for (var i = 0; i < result.resources.length; i++) allRes.push(result.resources[i]);
  }
  if (result.randomResources) {
    for (var j = 0; j < result.randomResources; j++) {
      allRes.push(RANDOM_RESOURCE_POOL[Math.floor(Math.random() * RANDOM_RESOURCE_POOL.length)]);
    }
  }

  for (var k = 0; k < allRes.length; k++) {
    var angle = allRes.length === 1 ? 0 : ((k / allRes.length) * Math.PI * 2 - Math.PI / 2);
    var dist = CARD_W * 0.7 + 25;
    var rx = card.x + CARD_W / 2 + Math.cos(angle) * dist - CARD_W / 2;
    var ry = card.y + CARD_H / 2 + Math.sin(angle) * dist - CARD_H / 2;
    createCard(allRes[k], rx, ry);
  }
  if (allRes.length > 0) {
    var names = {};
    for (var m = 0; m < allRes.length; m++) {
      var n = CARD_DEFS[allRes[m]].name;
      names[n] = (names[n] || 0) + 1;
    }
    var parts = [];
    for (var nm in names) parts.push(nm + ' ' + names[nm] + '개');
    log('\u2728 ' + parts.join(', ') + ' 획득!');
  }

  // Return worker
  if (card.storedWorker) {
    var sw = card.storedWorker;
    var shouldDie = result.workerDeathChance && Math.random() < result.workerDeathChance;
    if (shouldDie) {
      log('\u{1F480} ' + CARD_DEFS[sw.type].name + '이(가) 전투 중 사망했습니다...');
    } else if (sw.removalTimeLeft > 0) {
      var returned = createCard(sw.type, card.x - CARD_W - 15, card.y);
      returned.removalTimeLeft = sw.removalTimeLeft;
      returned.removalTimeMax = sw.removalTimeMax;
      log('\u{1F44B} ' + CARD_DEFS[sw.type].name + ' 작업 완료');
    }
    card.storedWorker = null;
  }

  // Handle building/nature state after work
  if (result.destroySelf) {
    removeCard(card);
  } else {
    if (result.transform) {
      var tdef = CARD_DEFS[result.transform];
      log('\u{1F504} ' + def.name + ' \u2192 ' + tdef.name);
      transformCard(card, result.transform);
    }
    if (result.resetRemoval && card.removalTimeMax) {
      card.removalTimeLeft = card.removalTimeMax;
    }
  }
}

// ═══════════════════════════════════════════
//  WALL / DAMAGE SYSTEM
// ═══════════════════════════════════════════
function applyNegativeDamage(amount) {
  var remaining = amount;
  while (remaining > 0) {
    var wall = null;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].visible && cards[i].type === 'wall' && cards[i].hp > 0) {
        wall = cards[i]; break;
      }
    }
    if (wall) {
      var absorbed = Math.min(remaining, wall.hp);
      wall.hp -= absorbed;
      remaining -= absorbed;
      log('\u{1F6E1}\uFE0F 성벽이 ' + absorbed + ' 피해 흡수 (HP: ' + wall.hp + ')');
      if (wall.hp <= 0) {
        log('\u{1F4A5} 성벽이 파괴되었습니다!', true);
        removeCard(wall);
      }
    } else {
      var targets = cards.filter(function(c) {
        if (!c.visible) return false;
        var cat = CARD_DEFS[c.type].category;
        return (cat === 'human' || cat === 'building' || cat === 'resource') && c.type !== 'wall';
      });
      if (targets.length > 0) {
        var victim = targets[Math.floor(Math.random() * targets.length)];
        log('\u{1F4A2} ' + CARD_DEFS[victim.type].name + '이(가) 파괴되었습니다!', true);
        removeCard(victim);
      }
      remaining--;
    }
  }
}

// ═══════════════════════════════════════════
//  INTERACTIONS
// ═══════════════════════════════════════════
function findCombination(ta, tb) {
  for (var i = 0; i < COMBINATIONS.length; i++) {
    var c = COMBINATIONS[i];
    if ((ta === c.a && tb === c.b) || (ta === c.b && tb === c.a)) return c.result;
  }
  return null;
}

function getInteraction(a, b) {
  var at = a.type, bt = b.type;
  var ad = CARD_DEFS[at], bd = CARD_DEFS[bt];

  // Food + Person = reproduction
  if (at === 'food' && bt === 'person') return { type: 'reproduce', food: a, person: b };
  if (bt === 'food' && at === 'person') return { type: 'reproduce', food: b, person: a };

  // Spear + Person = Warrior
  if (at === 'spear' && bt === 'person') return { type: 'transform', tool: a, target: b, newType: 'warrior' };
  if (bt === 'spear' && at === 'person') return { type: 'transform', tool: b, target: a, newType: 'warrior' };

  // Person → workable target (workerType 'person')
  if (at === 'person' && bd.workerType === 'person' && bd.workTime && !b.isWorking)
    return { type: 'work', worker: a, target: b };
  if (bt === 'person' && ad.workerType === 'person' && ad.workTime && !a.isWorking)
    return { type: 'work', worker: b, target: a };

  // Warrior → huntable target (workerType 'warrior')
  if (at === 'warrior' && bd.workerType === 'warrior' && bd.workTime && !b.isWorking)
    return { type: 'work', worker: a, target: b };
  if (bt === 'warrior' && ad.workerType === 'warrior' && ad.workTime && !a.isWorking)
    return { type: 'work', worker: b, target: a };

  // Brick + Wall = heal
  if (at === 'brick' && bt === 'wall') return { type: 'heal_wall', brick: a, wall: b };
  if (bt === 'brick' && at === 'wall') return { type: 'heal_wall', brick: b, wall: a };

  // Resource combinations
  var combo = findCombination(at, bt);
  if (combo) return { type: 'combine', cardA: a, cardB: b, result: combo };

  return null;
}

function canInteract(a, b) {
  return getInteraction(a, b) !== null;
}

function executeInteraction(a, b) {
  var inter = getInteraction(a, b);
  if (!inter) return false;

  switch (inter.type) {
    case 'reproduce':
      log('\u{1F476} 새로운 사람이 태어났습니다!');
      removeCard(inter.food);
      createCard('person', inter.person.x + CARD_W + 10, inter.person.y);
      return true;

    case 'transform':
      var nDef = CARD_DEFS[inter.newType];
      log('\u{1F527} ' + nDef.name + '이(가) 되었습니다!');
      removeCard(inter.tool);
      transformCard(inter.target, inter.newType);
      return true;

    case 'work':
      var wDef = CARD_DEFS[inter.worker.type];
      var tDef = CARD_DEFS[inter.target.type];
      log('\u2692\uFE0F ' + wDef.name + ' \u2192 ' + tDef.name + ' 작업 시작');
      inter.target.storedWorker = {
        type: inter.worker.type,
        removalTimeLeft: inter.worker.removalTimeLeft,
        removalTimeMax: inter.worker.removalTimeMax
      };
      inter.target.isWorking = true;
      inter.target.workTimeLeft = inter.target.workTimeMax;
      removeCard(inter.worker, false);
      return true;

    case 'heal_wall':
      inter.wall.hp = (inter.wall.hp || 0) + 3;
      log('\u{1F9F1} 성벽 수리! (HP: ' + inter.wall.hp + ')');
      removeCard(inter.brick);
      return true;

    case 'combine':
      var rDef = CARD_DEFS[inter.result];
      log('\u{1F528} ' + rDef.name + ' 제작!');
      var cx = (inter.cardA.x + inter.cardB.x) / 2;
      var cy = (inter.cardA.y + inter.cardB.y) / 2;
      removeCard(inter.cardA, false);
      removeCard(inter.cardB, false);
      var newCard = createCard(inter.result, cx, cy);
      if (inter.result === 'wall') newCard.hp = 5;
      return true;
  }
  return false;
}

// ═══════════════════════════════════════════
//  DRAG & DROP
// ═══════════════════════════════════════════
function setupEventListeners() {
  canvas.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);

  document.querySelectorAll('.speed-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      gameSpeed = parseFloat(btn.dataset.speed);
      document.querySelectorAll('.speed-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('.add-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var type = btn.dataset.type;
      var cr = canvas.getBoundingClientRect();
      var x = cr.width / 2 - CARD_W / 2 + (Math.random() - 0.5) * 140;
      var y = cr.height / 2 - CARD_H / 2 + (Math.random() - 0.5) * 140;
      createCard(type, x, y);
      log('\u2795 ' + CARD_DEFS[type].name + ' 추가');
    });
  });
}

function findCardAt(cx, cy) {
  var found = null, foundZ = -1;
  for (var i = 0; i < cards.length; i++) {
    var c = cards[i];
    if (!c.visible) continue;
    var z = parseInt(c.element.style.zIndex) || 0;
    if (cx >= c.x && cx <= c.x + CARD_W && cy >= c.y && cy <= c.y + CARD_H && z > foundZ) {
      found = c; foundZ = z;
    }
  }
  return found;
}

function findOverlapping(card) {
  var cx = card.x + CARD_W / 2;
  var cy = card.y + CARD_H / 2;
  var best = null, bestDist = Infinity;
  for (var i = 0; i < cards.length; i++) {
    var o = cards[i];
    if (o.id === card.id || !o.visible) continue;
    if (cx >= o.x && cx <= o.x + CARD_W && cy >= o.y && cy <= o.y + CARD_H) {
      var dx = cx - (o.x + CARD_W / 2);
      var dy = cy - (o.y + CARD_H / 2);
      var dist = dx * dx + dy * dy;
      if (dist < bestDist) { bestDist = dist; best = o; }
    }
  }
  return best;
}

function onMouseDown(e) {
  var cr = canvas.getBoundingClientRect();
  var cx = e.clientX - cr.left;
  var cy = e.clientY - cr.top;
  var card = findCardAt(cx, cy);
  if (!card || card.isWorking) return;

  topZ++;
  card.element.style.zIndex = topZ;
  dragState = {
    card: card,
    offsetX: cx - card.x,
    offsetY: cy - card.y
  };
  card.element.classList.add('dragging');
}

function onMouseMove(e) {
  if (!dragState) return;
  var cr = canvas.getBoundingClientRect();
  var cx = e.clientX - cr.left;
  var cy = e.clientY - cr.top;
  var card = dragState.card;

  card.x = Math.max(0, Math.min(cr.width - CARD_W, cx - dragState.offsetX));
  card.y = Math.max(0, Math.min(cr.height - CARD_H, cy - dragState.offsetY));
  card.element.style.left = card.x + 'px';
  card.element.style.top = card.y + 'px';

  var target = findOverlapping(card);
  if (highlightTarget && highlightTarget !== target) {
    highlightTarget.element.classList.remove('drop-target');
  }
  if (target && canInteract(card, target)) {
    target.element.classList.add('drop-target');
    highlightTarget = target;
  } else {
    highlightTarget = null;
  }
}

function onMouseUp() {
  if (!dragState) return;
  var card = dragState.card;
  card.element.classList.remove('dragging');

  if (cards.includes(card)) {
    var target = findOverlapping(card);
    if (target && canInteract(card, target)) {
      executeInteraction(card, target);
    }
  }

  if (highlightTarget) {
    highlightTarget.element.classList.remove('drop-target');
    highlightTarget = null;
  }
  dragState = null;
}

function onTouchStart(e) {
  e.preventDefault();
  var t = e.touches[0];
  onMouseDown({ clientX: t.clientX, clientY: t.clientY });
}
function onTouchMove(e) {
  e.preventDefault();
  var t = e.touches[0];
  onMouseMove({ clientX: t.clientX, clientY: t.clientY });
}
function onTouchEnd() { onMouseUp(); }

// ═══════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════
function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '';
  var s = Math.max(0, Math.ceil(seconds));
  var min = Math.floor(s / 60);
  var sec = s % 60;
  return min + ':' + (sec < 10 ? '0' : '') + sec;
}

function log(message, isWarning) {
  var entry = document.createElement('div');
  entry.className = 'log-entry';
  if (isWarning) entry.classList.add('warning');

  var time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = formatTime(gameTime);

  var msg = document.createElement('span');
  msg.className = 'log-msg';
  msg.textContent = message;

  entry.appendChild(time);
  entry.appendChild(msg);
  logEl.insertBefore(entry, logEl.firstChild);
  while (logEl.children.length > 60) logEl.removeChild(logEl.lastChild);
}

function updateCardCount() {
  document.getElementById('card-count').textContent = cards.filter(function(c) { return c.visible; }).length;
}

// ═══════════════════════════════════════════
//  START
// ═══════════════════════════════════════════
window.addEventListener('DOMContentLoaded', function() {
  requestAnimationFrame(init);
});
