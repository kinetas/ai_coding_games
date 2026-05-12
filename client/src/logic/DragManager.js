const LONG_PRESS_MS = 800;
const MERGE_HOLD_MS = 3000;

export class DragManager {
  constructor(scene, state, engine) {
    this._scene       = scene;
    this._state       = state;
    this._engine      = engine;
    this._dragging    = null;  // { sprite, stack, offsetX, offsetY }
    this._longTimer   = null;
    this._pendingKey  = 0;
    this._hoverTarget = null;  // sprite currently highlighted as drop target
    this._lastPtrX    = 0;
    this._lastPtrY    = 0;
    this._mergeTimer  = null;  // 같은 타입 호버 3초 병합 타이머
    this._mergeReady  = false; // 3초 충족 여부
    this._setupGlobalInput();
  }

  // ── 스프라이트별 바인딩 ───────────────────────────────────────────

  bindSprite(sprite, stack) {
    sprite.on('pointerover', () => {
      if (!this._dragging) sprite.setHighlight(true);
    });
    sprite.on('pointerout', () => {
      if (this._hoverTarget !== sprite) sprite.setHighlight(false);
    });
    sprite.on('pointerdown', (ptr) => this._onPointerDown(ptr, sprite, stack));
  }

  // ── 씬 전역 입력 (드래그 중 마우스가 카드 밖으로 나가도 추적) ────

  _setupGlobalInput() {
    this._scene.input.keyboard.on('keydown', (e) => {
      const n = parseInt(e.key);
      if (n >= 1 && n <= 9) this._pendingKey = n;
    });

    this._scene.input.on('pointermove', (ptr) => {
      this._lastPtrX = ptr.x;
      this._lastPtrY = ptr.y;
      if (!this._dragging) return;

      this._dragging.sprite.x = ptr.x - this._dragging.offsetX;
      this._dragging.sprite.y = ptr.y - this._dragging.offsetY;
      this._updateHoverHighlight(ptr.x, ptr.y);
    });

    this._scene.input.on('pointerup', (ptr) => {
      if (this._dragging) this._onPointerUp(ptr);
    });
  }

  // ── 드래그 시작 ──────────────────────────────────────────────────

  _onPointerDown(ptr, sprite, stack) {
    if (this._dragging) return;

    // 숫자키 확인 (N장 분리) — 조합 중인 카드는 분리 불가
    const pendingN = (!stack.crafting && this._pendingKey > 0 && this._pendingKey < stack.count)
      ? this._pendingKey : 0;
    this._pendingKey = 0;

    this._dragging = {
      sprite, stack,
      offsetX: ptr.x - sprite.x,
      offsetY: ptr.y - sprite.y,
    };
    sprite.setDragging(true);

    if (pendingN > 0) {
      // 숫자키 → 즉시 N장 분리 후 드래그
      this._splitAndSwitchDrag(pendingN);
    } else if (!stack.crafting) {
      // 길게 누르기 → 1장 분리 (조합 중인 카드는 분리 불가)
      this._longTimer = this._scene.time.delayedCall(LONG_PRESS_MS, () => {
        this._splitAndSwitchDrag(1);
      });
    }
  }

  // ── 분리 후 드래그 전환 ──────────────────────────────────────────

  _splitAndSwitchDrag(n) {
    if (!this._dragging) return;
    const { sprite, stack } = this._dragging;
    if (stack.count <= 1 || n <= 0 || n >= stack.count) return;

    const cx = sprite.x, cy = sprite.y;

    // 원본 스택에서 n장 분리
    const split = stack.split(n);
    if (stack.count <= 0) {
      this._state.cards = this._state.cards.filter(s => s.id !== stack.id);
    }
    split.ratioX = cx / this._scene.scale.width;
    split.ratioY = cy / this._scene.scale.height;
    this._state.cards.push(split);

    // 원본 스프라이트 드래그 해제 + 뱃지 갱신
    sprite.setDragging(false);
    sprite.refresh(Date.now());

    // 분리 카드 스프라이트 생성 → 즉시 드래그 상태
    const splitSprite = this._scene._addCardSprite(split);
    splitSprite.setPosition(cx, cy);

    this._dragging = {
      sprite: splitSprite,
      stack: split,
      offsetX: this._lastPtrX - cx,
      offsetY: this._lastPtrY - cy,
    };
    splitSprite.setDragging(true);

    this._scene.events.emit('board:changed');
  }

  // ── 드롭 대상 하이라이트 ─────────────────────────────────────────

  _updateHoverHighlight(x, y) {
    const target = this._findDropTarget(x, y, this._dragging.stack);
    const newSp  = target?.sprite ?? null;

    if (this._hoverTarget && this._hoverTarget !== newSp) {
      this._hoverTarget.setHighlight(false);
      this._hoverTarget.setMergeHighlight(false);
      this._clearMergeTimer();
    }
    if (newSp && newSp !== this._hoverTarget) {
      newSp.setHighlight(true);
      // 같은 타입이면 3초 후 병합 준비 상태로 전환
      if (target.stack.type === this._dragging.stack.type) {
        this._mergeReady = false;
        this._mergeTimer = this._scene.time.delayedCall(MERGE_HOLD_MS, () => {
          this._mergeReady = true;
          if (this._hoverTarget) {
            this._hoverTarget.setHighlight(false);
            this._hoverTarget.setMergeHighlight(true);
          }
        });
      }
    }
    this._hoverTarget = newSp;
  }

  _clearMergeTimer() {
    if (this._mergeTimer) { this._mergeTimer.remove(); this._mergeTimer = null; }
    this._mergeReady = false;
  }

  // ── 드래그 종료 ──────────────────────────────────────────────────

  _onPointerUp(ptr) {
    if (!this._dragging) return;
    if (this._longTimer) { this._longTimer.remove(); this._longTimer = null; }

    const { sprite, stack } = this._dragging;
    const wasMergeReady = this._mergeReady;
    this._clearMergeTimer();

    if (this._hoverTarget) {
      this._hoverTarget.setHighlight(false);
      this._hoverTarget.setMergeHighlight(false);
      this._hoverTarget = null;
    }
    sprite.setDragging(false);
    sprite.setHighlight(false);

    const target = this._findDropTarget(ptr.x, ptr.y, stack);

    // 조합 중인 카드는 이동만 가능 (조합·병합 불가)
    if (!target || stack.crafting) {
      this._moveStack(stack, ptr.x, ptr.y);
    } else if (target.stack.type === stack.type) {
      // 3초 홀드 → 병합 / 레시피 있고 즉시 드롭 → 조합 / 레시피 없으면 항상 병합
      const recipe = this._engine.findRecipe(stack.type, target.stack.type);
      if (!wasMergeReady && recipe) {
        this._doCombine(stack, target.stack);
      } else {
        this._doMerge(stack, target.stack);
      }
    } else {
      this._doCombine(stack, target.stack);
    }

    this._dragging = null;
    this._scene.events.emit('board:changed');
  }

  // ── 조작 ─────────────────────────────────────────────────────────

  _doMerge(src, dst) {
    dst.count += src.count;
    this._state.cards = this._state.cards.filter(s => s.id !== src.id);
  }

  _doCombine(stackA, stackB) {
    const result = this._engine.combine(stackA, stackB, this._state.mode);
    if (result.error) {
      this._showFeedback(result.error, stackA.ratioX, stackA.ratioY, 'red');
      return;
    }
    this._scene.events.emit('combine:start', {
      stackA, stackB,
      recipe: result.recipe,
      craftTime: result.craftTime,
    });
  }

  _moveStack(stack, x, y) {
    stack.ratioX = x / this._scene.scale.width;
    stack.ratioY = y / this._scene.scale.height;
  }

  // ── 유틸 ─────────────────────────────────────────────────────────

  _findDropTarget(x, y, exclude) {
    if (!this._scene._spriteMap) return null;
    for (const [, sp] of this._scene._spriteMap) {
      if (sp.stack.id === exclude.id) continue;
      if (sp.stack.crafting) continue;
      const b = sp.getBounds();
      if (Phaser.Geom.Rectangle.Contains(b, x, y)) {
        return { sprite: sp, stack: sp.stack };
      }
    }
    return null;
  }

  _showFeedback(msg, rx, ry, color = 'red') {
    const x = rx * this._scene.scale.width;
    const y = ry * this._scene.scale.height - 60;
    const txt = this._scene.add.text(x, y, msg, {
      fontSize: '14px',
      color: color === 'red' ? '#ff4444' : '#44ff88',
      fontStyle: 'bold',
      backgroundColor: '#1a0d05dd',
      padding: { x: 6, y: 4 },
    }).setOrigin(0.5).setDepth(200);
    this._scene.time.delayedCall(1500, () => txt.destroy());
  }
}
