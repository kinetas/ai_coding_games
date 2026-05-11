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

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

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
    this.add.rectangle(W / 2, H / 2, W, H, 0x2d5a27);
    this.add.rectangle(W / 2, H / 2 - 10, W - 20, H - 100, 0x1e3d1a)
      .setStrokeStyle(2, 0x4a8a3a);

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
    this._makeBtn(W - 80, H - 50, '나가기', 0x663333, () => {
      this._socket?.disconnect();
      this.scene.start('LobbyScene');
    });

    // 이벤트 연결
    this._setupEvents();

    // 초기 카드 렌더링
    this._refreshBoard();

    this._lastTime = Date.now();
    this._gameOver = false;
  }

  _setupEvents() {
    // 조합 시작: 재료 카드를 뭉치에서 분리하고 조합 진행 상태로 전환
    this.events.on('combine:start', ({ stackA, stackB, recipe, craftTime }) => {
      // recipe 방향에 맞게 정규화
      let cardA = stackA, cardB = stackB;
      if (recipe.a !== stackA.type) { cardA = stackB; cardB = stackA; }

      // 스택 수량 > 1이면 카드 1장 분리
      if (cardA.count > 1) {
        const split = cardA.split(1);
        split.ratioX = cardA.ratioX + 0.02;
        split.ratioY = cardA.ratioY - 0.02;
        this.state.cards.push(split);
        cardA = split;
      }
      if (cardB.count > 1) {
        const split = cardB.split(1);
        split.ratioX = cardB.ratioX - 0.02;
        split.ratioY = cardB.ratioY + 0.02;
        this.state.cards.push(split);
        cardB = split;
      }

      const now = Date.now();
      const endAt = now + craftTime;
      cardA.crafting = true; cardA.craftEndAt = endAt; cardA.craftStartAt = now;
      cardB.crafting = true; cardB.craftEndAt = endAt; cardB.craftStartAt = now;

      this.state.craftJobs.push({ cardAId: cardA.id, cardBId: cardB.id, recipe, endAt });
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

    // HUD 갱신
    this._hud.refresh(this.state, this._engine);

    // 패배 체크
    if (this._checker.checkSolo(this.state.cards) === 'DEFEAT') {
      this._gameOver = true;
      this._onDefeat();
    }
  }

  _onNaturalSpawn(type, count) {
    const rx = 0.1 + Math.random() * 0.8;
    const ry = 0.1 + Math.random() * 0.7;

    if (['WOLF', 'BEAR'].includes(type)) {
      const stack = createThreatCard(type, count);
      if (type === 'BEAR') stack.strength = 3;
      this.state.cards.push(stack);
    } else {
      this.state.cards.push(new CardStack(type, count, rx, ry));
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
      const cardA = this.state.cards.find(c => c.id === job.cardAId);
      const cardB = this.state.cards.find(c => c.id === job.cardBId);

      if (cardA) { cardA.crafting = false; cardA.craftEndAt = null; cardA.craftStartAt = null; }
      if (cardB) { cardB.crafting = false; cardB.craftEndAt = null; cardB.craftStartAt = null; }

      if (cardA && cardB) {
        const outcome = this._engine.applyRecipe(cardA, cardB, job.recipe, this.state);
        this.state.combineCount += 1;

        if (outcome.specialMode?.startsWith('dispatch_')) {
          const unitType = outcome.specialMode.replace('dispatch_', '').toUpperCase();
          this._socket?.dispatchUnit(unitType);
          this._showFeedback(`✓ ${unitType} 파견!`, 0.5, 0.5, true);
        } else {
          const label = job.recipe.result[0]?.type ?? '조합';
          this._showFeedback(`✓ ${label} 완성!`, cardA.ratioX, cardA.ratioY, true);
        }

        this._socket?.sendCombination(this.state.cards);
      }
    }

    this.state.craftJobs = this.state.craftJobs.filter(j => !done.includes(j));
    this._refreshBoard();
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

    // 새 카드 추가 & 위치 갱신
    const now = Date.now();
    for (const stack of this.state.cards) {
      let sp = this._spriteMap.get(stack.id);
      if (!sp) {
        sp = this._addCardSprite(stack);
      }
      sp.setPosition(
        Math.min(W - 50, Math.max(50, stack.ratioX * W)),
        Math.min(boardH - 50, Math.max(70, stack.ratioY * boardH))
      );
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
    const color = success ? '#00cc44' : '#ff2222';
    const txt = this.add.text(x, y, msg, {
      fontSize: '15px', color,
      fontStyle: 'bold',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: txt, y: y - 40, alpha: 0,
      duration: 1200, ease: 'Power1',
      onComplete: () => txt.destroy(),
    });
  }

  _makeBtn(x, y, label, color, cb) {
    const bg = this.add.rectangle(x, y, 100, 36, color).setInteractive().setDepth(10);
    this.add.text(x, y, label, { fontSize: '13px', color: '#fff' }).setOrigin(0.5).setDepth(11);
    bg.on('pointerdown', cb);
  }
}
