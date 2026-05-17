import { createSoloState, createPvPClientState } from '../models/GameState.js';
import { CardStack } from '../models/CardStack.js';
import { CombinationEngine } from '../logic/CombinationEngine.js';
import { SpawnManager, RaiderSpawner, createThreatCard, applyRaid, deductCards } from '../logic/SpawnManager.js';
import { WinLoseChecker } from '../logic/WinLoseChecker.js';
import { DragManager } from '../logic/DragManager.js';
import { CombatResolver } from '../logic/CombatResolver.js';
import { RaiderAI } from '../logic/RaiderAI.js';
import { ArcherDefense } from '../logic/ArcherDefense.js';
import { ScoutManager } from '../logic/ScoutManager.js';
import { CardSprite } from '../ui/CardSprite.js';
import { HUD } from '../ui/HUD.js';
import { SoundManager } from '../ui/SoundManager.js';

const ICON_KEYS = [
  'person', 'warrior', 'archer', 'scout',
  'rock', 'tree',
  'wolf', 'bear',
  'food', 'seed', 'stone', 'wood', 'spear', 'bow', 'boat', 'brick',
  'wall', 'farmland', 'orchard', 'log_house', 'village', 'city',
  'raider', 'catapult',
];

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  preload() {
    ICON_KEYS.forEach(k =>
      this.load.svg(`icon_${k}`, `assets/icons/${k}.svg`, { width: 64, height: 64 })
    );
  }

  create(data) {
    this._data = data;

    // 상태 초기화
    if (data.mode === 'solo') {
      this.state = createSoloState(data.nickname);
    } else {
      this.state = createPvPClientState(data.nickname, data.role || 'p1');
      this._socket = data.socket || null;
    }

    // 배경
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a0d05);
    // 좌우 석조 기둥
    this.add.rectangle(14, H / 2, 28, H, 0x231208);
    this.add.rectangle(W - 14, H / 2, 28, H, 0x231208);
    this.add.rectangle(28, H / 2, 2, H, 0xb87333, 0.25);
    this.add.rectangle(W - 28, H / 2, 2, H, 0xb87333, 0.25);
    // 플레이 필드 (황토빛 흙)
    this.add.rectangle(W / 2, H / 2 - 10, W - 36, H - 108, 0x2d1e0a)
      .setStrokeStyle(2, 0x6b4a2a);
    this.add.rectangle(W / 2, 56, W - 36, 4, 0x5a3e1e);

    this.state.craftJobs = [];

    // 모듈 초기화
    this._engine  = new CombinationEngine(() => this.state);
    this._checker = new WinLoseChecker();
    this._resolver = new CombatResolver();
    this._raidAI   = new RaiderAI(this._resolver);
    this._archerDef = new ArcherDefense();
    this._scoutMgr  = new ScoutManager(this._socket);

    // 스폰 매니저 (솔로 전용)
    if (data.mode === 'solo') {
      this._spawnMgr    = new SpawnManager((type, count) => this._onNaturalSpawn(type, count));
      this._raidSpawner = new RaiderSpawner((type, count) => this._onRaiderSpawn(type, count));
      this._spawnMgr.start();
    }

    // 스프라이트 맵
    this._spriteMap = new Map();

    // HUD
    this._hud = new HUD(this, data.mode);

    // 드래그 매니저
    this._dragMgr = new DragManager(this, this.state, this._engine);

    // 게임 나가기 버튼
    this._makeBtn(W - 270, H - 44, '← 나가기', () => {
      this._socket?.disconnect();
      this.scene.start('LobbyScene');
    });

    // 이벤트 연결
    this._setupEvents();

    // 초기 카드 렌더링
    this._refreshBoard();

    this._lastTime = Date.now();
    this._gameOver = false;

    SoundManager.get().playGameBGM();
    this.events.once('shutdown', () => SoundManager.get().stopBGM());
  }

  _setupEvents() {
    // 씬 재시작 시 중복 등록 방지 — 이전 create()에서 추가된 리스너 제거
    ['combine:start', 'kingdom:build', 'board:changed',
     'net:syncStatus', 'net:spawnUnit', 'net:scoutReport',
     'net:gameOver', 'net:opponentLeft'].forEach(e => this.events.off(e));

    this.events.on('combine:start', ({ stackA, stackB, recipe, craftTime }) => {
      // recipe 방향 정규화
      let cardA = stackA, cardB = stackB;
      if (recipe.a !== stackA.type) { cardA = stackB; cardB = stackA; }

      const now = Date.now();
      const endAt = now + craftTime;
      const job = {
        endAt, recipe,
        posRx: cardA.ratioX, posRy: cardA.ratioY,
        timerCardIds: [],  // 소요시간 표시 카드 (비소모)
        resultCardIds: [], // 미리 생성된 결과 카드 (잠금 상태)
        createAtEnd: false,
        farmlandCardId: null,
        dispatchType: recipe.dispatchType ?? null,
        probCardId: null, wolfStrength: 0,
        workerId: null,          // 작업 후 복귀하는 PERSON 카드 ID
        workerReturnId: null,    // PERSON 복귀할 원본 뭉치 ID
        probWorkerReturnId: null, // 전사 생존 시 복귀할 원본 뭉치 ID
      };

      // 늑대/곰: 소모 전에 strength 저장
      if (recipe.consumeB === 'prob') {
        job.wolfStrength = recipe.combatType === 'bear' ? 3 : cardA.count;
      }

      // ── cardA 처리 ──
      if (recipe.consumeA) {
        // 소모: 즉시 삭제
        cardA.count -= 1;
        if (cardA.count <= 0) this.state.cards = this.state.cards.filter(c => c.id !== cardA.id);
      } else {
        // 비소모: 소요시간 표시
        cardA.crafting = true; cardA.craftEndAt = endAt; cardA.craftStartAt = now;
        job.timerCardIds.push(cardA.id);
        if (recipe.farmlandProduce) job.farmlandCardId = cardA.id;
      }

      // ── cardB 처리 ──
      if (recipe.consumeB === true) {
        // 소모: 즉시 삭제
        cardB.count -= 1;
        if (cardB.count <= 0) this.state.cards = this.state.cards.filter(c => c.id !== cardB.id);
      } else if (recipe.consumeB === 'prob') {
        // 전사: 낱개로 분리 후 작업 중 잠금, 완료 시 생존 시 원본 복귀
        let warrior = cardB;
        if (cardB.count > 1) {
          const split = cardB.split(1);
          split.ratioX = cardB.ratioX + 0.02;
          split.ratioY = cardB.ratioY + 0.02;
          this.state.cards.push(split);
          job.probWorkerReturnId = cardB.id;
          warrior = split;
        }
        warrior.crafting = true; warrior.craftEndAt = endAt; warrior.craftStartAt = now;
        job.timerCardIds.push(warrior.id);
        job.probCardId = warrior.id;
      } else if (recipe.consumeA) {
        // consumeA=true, consumeB=false: A 삭제됐으니 B가 소요시간 표시
        cardB.crafting = true; cardB.craftEndAt = endAt; cardB.craftStartAt = now;
        job.timerCardIds.push(cardB.id);
      } else {
        // consumeA=false, consumeB=false (FARMLAND+PERSON):
        // PERSON을 낱개로 분리해 작업 중 잠금, 완료 후 원본 뭉치로 복귀
        let worker = cardB;
        if (cardB.count > 1) {
          const split = cardB.split(1);
          split.ratioX = cardB.ratioX + 0.03;
          split.ratioY = cardB.ratioY + 0.03;
          this.state.cards.push(split);
          job.workerReturnId = cardB.id;
          worker = split;
        }
        worker.crafting = true; worker.craftEndAt = endAt; worker.craftStartAt = now;
        job.timerCardIds.push(worker.id);
        job.workerId = worker.id;
      }

      // ── 결과 카드 처리 ──
      if (job.timerCardIds.length > 0 || job.dispatchType) {
        // worker 카드가 있거나 파견: 완료 시 결과 생성
        job.createAtEnd = !job.dispatchType;
      } else {
        // 양쪽 모두 소모됨: 결과 카드를 잠금 상태로 미리 생성
        for (const r of recipe.result) {
          const rx = Math.min(0.9, Math.max(0.1, job.posRx + (Math.random() - 0.5) * 0.08));
          const ry = Math.min(0.9, Math.max(0.1, job.posRy + (Math.random() - 0.5) * 0.08));
          const pre = new CardStack(r.type, r.count, rx, ry);
          pre.crafting = true; pre.craftEndAt = endAt; pre.craftStartAt = now;
          this.state.cards.push(pre);
          job.resultCardIds.push(pre.id);
        }
      }

      this.state.craftJobs.push(job);
      this._refreshBoard();
    });

    // 왕국 건설
    this.events.on('kingdom:build', () => {
      if (this.state.mode === 'pvp') {
        this._socket?.kingdomBuild(this.state.cards);
      } else {
        // 솔로: 최고 점수로 저장 후 계속
        this._showFeedback('👑 왕국 건설 달성! (계속 플레이)', 0.5, 0.3, true);
      }
    });

    // 보드 변경
    this.events.on('board:changed', () => this._refreshBoard());

    // PvP 소켓 이벤트
    if (this._socket) {
      this.events.on('net:syncStatus', (d) => {
        this.state.opponentInfo = d;
        this._hud.updateOpponent(d);
      });
      this.events.on('net:spawnUnit', (d) => {
        this._onRaiderSpawn(d.unitType, 1);
        this._showFeedback(`⚠️ 적 ${d.unitType} 출현!`, 0.5, 0.3, false);
      });
      this.events.on('net:scoutReport', (d) => {
        this._scoutMgr.onReport(d);
      });
      this.events.on('net:gameOver', (d) => {
        const myRole = this.state.role || 'p1';
        this._endGame(d.winner === myRole ? 'WIN' : 'DEFEAT', d.scores);
      });
      this.events.on('net:opponentLeft', () => {
        this._showFeedback('상대방이 나갔습니다!', 0.5, 0.4, true);
        this.time.delayedCall(2000, () => this.scene.start('LobbyScene'));
      });
    }
  }

  update() {
    if (this._gameOver) return;

    const now = Date.now();
    const dt  = now - this._lastTime;
    this._lastTime = now;

    if (this.state.mode === 'solo') {
      this.state.survivalTime += dt / 1000;
      this._spawnMgr?.update(dt, this.state.cards);
      this._raidSpawner?.update();
    }

    // 위협 카드 만료 처리 (늑대/곰)
    this._processThreatExpiry();

    // 조합 완료 처리
    this._processCraftJobs();

    // 적 유닛 AI 틱 (약탈자/투석기)
    const enemies = this.state.cards.filter(c => ['RAIDER', 'CATAPULT'].includes(c.type));
    for (const enemy of enemies) {
      this._raidAI.tick(enemy, this.state.cards, dt);
    }

    // 궁수 자동 방어
    if (enemies.length > 0) this._archerDef.tick(this.state.cards, enemies);

    // 제거 마킹된 카드 정리
    const before = this.state.cards.length;
    this.state.cards = this.state.cards.filter(c => !c._toRemove);
    if (this.state.cards.length !== before) this._refreshBoard();

    // 제작 중인 카드 매 프레임 갱신 (진행 바)
    if (this.state.craftJobs.length > 0) {
      for (const job of this.state.craftJobs) {
        for (const id of [...job.timerCardIds, ...job.resultCardIds]) {
          this._spriteMap.get(id)?.refresh(now);
        }
      }
    }

    // HUD 갱신
    this._hud.refresh(this.state, this._engine);

    // 패배 체크
    if (this._checker.checkSolo(this.state.cards) === 'DEFEAT') {
      this._gameOver = true;
      this._onDefeat();
    }
  }

  _onNaturalSpawn(type, count) {
    if (['WOLF', 'BEAR'].includes(type)) {
      // 위협 카드: 각자 만료 타이머가 다르므로 항상 별도 스택
      const stack = createThreatCard(type, count);
      this.state.cards.push(stack);
    } else {
      // 자원 카드: 기존 스택에 합치기, 없으면 새로 생성
      const existing = this.state.cards.find(c => c.type === type);
      if (existing) {
        existing.count += count;
      } else {
        const rx = 0.1 + Math.random() * 0.8;
        const ry = 0.1 + Math.random() * 0.7;
        this.state.cards.push(new CardStack(type, count, rx, ry));
      }
    }
    this._refreshBoard();
  }

  _onRaiderSpawn(type, count) {
    const rx = 0.1 + Math.random() * 0.8;
    const stack = new CardStack(type, count, rx, 0.15);
    this.state.cards.push(stack);
    this._refreshBoard();
  }

  _processCraftJobs() {
    if (!this.state.craftJobs.length) return;
    const now = Date.now();
    const done = this.state.craftJobs.filter(j => now >= j.endAt);
    if (!done.length) return;

    for (const job of done) {
      // 비소모 worker 카드: 잠금 해제
      for (const id of job.timerCardIds) {
        const c = this.state.cards.find(x => x.id === id);
        if (c) { c.crafting = false; c.craftEndAt = null; c.craftStartAt = null; }
      }
      // 미리 생성된 결과 카드: 기존 스택과 병합 가능하면 병합, 아니면 잠금 해제
      for (const id of job.resultCardIds) {
        const c = this.state.cards.find(x => x.id === id);
        if (!c) continue;
        const existing = this.state.cards.find(x => x.type === c.type && x.id !== id && !x.crafting);
        if (existing) {
          existing.count += c.count;
          this.state.cards = this.state.cards.filter(x => x.id !== id);
        } else {
          c.crafting = false; c.craftEndAt = null; c.craftStartAt = null;
        }
      }

      // 농지 producing 모드
      if (job.farmlandCardId) {
        const fl = this.state.cards.find(c => c.id === job.farmlandCardId);
        if (fl) fl.mode = 'producing';
      }

      // worker PERSON: 원본 뭉치로 복귀
      if (job.workerId) {
        const worker = this.state.cards.find(c => c.id === job.workerId);
        if (worker && job.workerReturnId) {
          const origin = this.state.cards.find(c => c.id === job.workerReturnId);
          if (origin) {
            origin.count += worker.count;
            this.state.cards = this.state.cards.filter(c => c.id !== worker.id);
          }
          // origin이 이미 사라진 경우 worker는 독립 카드로 남음
        }
      }

      // 전사 생존 확률 계산
      if (job.probCardId) {
        const warrior = this.state.cards.find(c => c.id === job.probCardId);
        if (warrior) {
          const res = this._engine._resolveWarriorVsWolf(warrior.count, job.wolfStrength);
          if (res.removed > 0) {
            warrior.count = Math.max(0, warrior.count - res.removed);
            if (warrior.count <= 0) this.state.cards = this.state.cards.filter(c => c.id !== warrior.id);
          }
          // 생존 시 원본 뭉치로 복귀
          if (warrior.count > 0 && job.probWorkerReturnId) {
            const origin = this.state.cards.find(c => c.id === job.probWorkerReturnId);
            if (origin) {
              origin.count += warrior.count;
              this.state.cards = this.state.cards.filter(c => c.id !== warrior.id);
            }
          }
        }
      }

      // 파견
      if (job.dispatchType) {
        this._socket?.dispatchUnit(job.dispatchType);
        this._showFeedback(`✓ ${job.dispatchType} 파견!`, 0.5, 0.5, true);
      }

      // worker 기반 조합: 완료 시 결과 카드 생성 (기존 스택 있으면 병합)
      if (job.createAtEnd) {
        for (const r of job.recipe.result) {
          const rx = Math.min(0.9, Math.max(0.1, job.posRx + (Math.random() - 0.5) * 0.08));
          const ry = Math.min(0.9, Math.max(0.1, job.posRy + (Math.random() - 0.5) * 0.08));
          this._mergeOrCreate(r.type, r.count, rx, ry);
        }
        const label = job.recipe.result[0]?.type ?? '완성';
        this._showFeedback(`✓ ${label} 완성!`, job.posRx, job.posRy, true);
      } else if (job.resultCardIds.length > 0) {
        const label = job.recipe.result[0]?.type ?? '완성';
        this._showFeedback(`✓ ${label} 완성!`, job.posRx, job.posRy, true);
      }

      this.state.combineCount += 1;
      this._socket?.sendCombination(this.state.cards);
    }

    this.state.craftJobs = this.state.craftJobs.filter(j => !done.includes(j));
    if (done.length > 0) this._autoFarmlandProduce();
    this._refreshBoard();
  }

  // 생산 모드 농지: 유휴 PERSON이 있으면 자동으로 수확 사이클 재시작
  _autoFarmlandProduce() {
    const activeFarmIds = new Set(
      this.state.craftJobs.flatMap(j => j.farmlandCardId ? [j.farmlandCardId] : [])
    );
    const farms = this.state.cards.filter(
      c => c.type === 'FARMLAND' && c.mode === 'producing' && !c.crafting && !activeFarmIds.has(c.id)
    );
    for (const farm of farms) {
      const person = this.state.cards.find(c => c.type === 'PERSON' && !c.crafting);
      if (!person) break;
      const recipe = this._engine.findRecipe('FARMLAND', 'PERSON');
      if (recipe) {
        this.events.emit('combine:start', { stackA: farm, stackB: person, recipe, craftTime: recipe.craftTime });
      }
    }
  }

  _mergeOrCreate(type, count, rx, ry) {
    const existing = this.state.cards.find(c => c.type === type && !c.crafting);
    if (existing) {
      existing.count += count;
    } else {
      this.state.cards.push(new CardStack(type, count, rx, ry));
    }
  }

  _processThreatExpiry() {
    const now = Date.now();
    const threats = this.state.cards.filter(c =>
      ['WOLF', 'BEAR'].includes(c.type) && c.expiresAt && now >= c.expiresAt
    );
    for (const card of threats) {
      const strength = card.type === 'BEAR' ? 3 : card.count;
      applyRaid(this.state.cards, strength);
      this.state.cards = this.state.cards.filter(c => c.id !== card.id);
      this._showFeedback('🐺 습격!', 0.5, 0.4, false);
    }
    if (threats.length > 0) this._refreshBoard();
  }

  _refreshBoard() {
    const W = this.scale.width, H = this.scale.height;
    const boardH = H - 90;

    // 제거된 스택 처리
    for (const [id, sp] of this._spriteMap) {
      if (!this.state.cards.find(s => s.id === id)) {
        sp.destroy();
        this._spriteMap.delete(id);
      }
    }

    // 새 카드 추가 & 위치 갱신 (드래그 중인 카드는 위치 갱신 제외)
    const draggingId = this._dragMgr?._dragging?.stack?.id;
    const now = Date.now();
    for (const stack of this.state.cards) {
      let sp = this._spriteMap.get(stack.id);
      if (!sp) {
        sp = this._addCardSprite(stack);
      }
      if (stack.id !== draggingId) {
        sp.setPosition(
          Math.min(W - 50, Math.max(50, stack.ratioX * W)),
          Math.min(boardH - 50, Math.max(70, stack.ratioY * boardH))
        );
      }
      sp.refresh(now);
    }
  }

  _addCardSprite(stack) {
    const sp = new CardSprite(this, stack);
    this._spriteMap.set(stack.id, sp);
    this._dragMgr.bindSprite(sp, stack);
    return sp;
  }

  _onDefeat() {
    const { isNew, prev } = this._checker.saveBestScore(
      this.state.combineCount, this.state.survivalTime
    );
    this.time.delayedCall(500, () => {
      this.scene.start('ResultScene', {
        mode:         'solo',
        result:       'DEFEAT',
        myScore:      this.state.combineCount,
        survivalTime: this.state.survivalTime,
        isNewRecord:  isNew,
        prevBest:     prev,
        nickname:     this.state.nickname,
      });
    });
  }

  _endGame(result, scores) {
    if (this._gameOver) return;
    this._gameOver = true;
    const myRole = this.state.role || 'p1';
    const opRole = myRole === 'p1' ? 'p2' : 'p1';
    this.time.delayedCall(300, () => {
      this.scene.start('ResultScene', {
        mode:    'pvp',
        result,
        myScore: scores?.[myRole] || this.state.combineCount,
        opScore: scores?.[opRole] || 0,
        nickname: this.state.nickname,
      });
    });
  }

  _showFeedback(msg, rx, ry, success) {
    const W = this.scale.width, H = this.scale.height;
    const x = rx * W, y = ry * (H - 90) - 50;
    const color = success ? '#d4af37' : '#c84040';
    const txt = this.add.text(x, y, msg, {
      fontSize: '15px', color,
      fontStyle: 'bold',
      backgroundColor: '#1a0d05cc',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: txt, y: y - 40, alpha: 0,
      duration: 1200, ease: 'Power1',
      onComplete: () => txt.destroy(),
    });
  }

  _makeBtn(x, y, label, cb) {
    this.add.rectangle(x + 2, y + 2, 112, 36, 0x0a0603).setDepth(10);
    const bg = this.add.rectangle(x, y, 112, 36, 0x3d2e1a)
      .setInteractive({ useHandCursor: true })
      .setDepth(10).setStrokeStyle(2, 0x6b4a2a);
    const txt = this.add.text(x, y, label, { fontSize: '13px', color: '#c8a870' })
      .setOrigin(0.5).setDepth(11);
    bg.on('pointerover', () => { bg.setFillStyle(0x5a3e20); bg.setStrokeStyle(2, 0xb87333); txt.setColor('#e8c88a'); SoundManager.get().sfxHover(); });
    bg.on('pointerout',  () => { bg.setFillStyle(0x3d2e1a); bg.setStrokeStyle(2, 0x6b4a2a); txt.setColor('#c8a870'); });
    bg.on('pointerdown', () => { SoundManager.get().sfxClick(); cb(); });
  }
}
