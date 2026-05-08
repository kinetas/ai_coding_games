const LONG_PRESS_MS = 1000;

export class DragManager {
  constructor(scene, state, engine) {
    this._scene    = scene;
    this._state    = state;
    this._engine   = engine;
    this._dragging = null;
    this._longPressTimer = null;
    this._splitCount     = 0;
    this._pendingKey     = 0;
    this._setupGlobalInput();
  }

  bindSprite(sprite, stack) {
    sprite.on('pointerover',  () => sprite.setHighlight(true));
    sprite.on('pointerout',   () => sprite.setHighlight(false));
    sprite.on('pointerdown',  (ptr) => this._onPointerDown(ptr, sprite, stack));
    sprite.on('pointermove',  (ptr) => this._onPointerMove(ptr));
    sprite.on('pointerup',    (ptr) => this._onPointerUp(ptr));
  }

  _setupGlobalInput() {
    this._scene.input.keyboard.on('keydown', (e) => {
      const n = parseInt(e.key);
      if (n >= 1 && n <= 9) this._pendingKey = n;
    });
  }

  _onPointerDown(ptr, sprite, stack) {
    sprite.setDragging(true);
    this._longPressTimer = this._scene.time.delayedCall(LONG_PRESS_MS, () => {
      this._splitCount = 1;
      sprite.setHighlight(true);
    });
    this._dragging = {
      sprite, stack,
      offsetX: ptr.x - sprite.x,
      offsetY: ptr.y - sprite.y,
    };
  }

  _onPointerMove(ptr) {
    if (!this._dragging) return;
    this._dragging.sprite.x = ptr.x - this._dragging.offsetX;
    this._dragging.sprite.y = ptr.y - this._dragging.offsetY;
  }

  _onPointerUp(ptr) {
    if (!this._dragging) return;
    if (this._longPressTimer) { this._longPressTimer.remove(); this._longPressTimer = null; }

    const { sprite, stack } = this._dragging;
    sprite.setDragging(false);
    sprite.setHighlight(false);

    let splitN = this._splitCount > 0
      ? this._splitCount
      : (this._pendingKey > 0 ? this._pendingKey : stack.count);
    this._splitCount = 0;
    this._pendingKey = 0;

    const target = this._findDropTarget(ptr.x, ptr.y, stack);

    if (!target) {
      if (splitN < stack.count) {
        this._doSplit(stack, splitN, ptr.x, ptr.y);
      } else {
        this._moveStack(stack, ptr.x, ptr.y);
      }
    } else if (target.stack.type === stack.type) {
      this._doMerge(stack, target.stack, splitN);
    } else {
      this._doCombine(stack, target.stack, splitN);
    }

    this._dragging = null;
    this._scene.events.emit('board:changed');
  }

  _doSplit(stack, n, dropX, dropY) {
    if (stack.count <= 1) {
      this._moveStack(stack, dropX, dropY);
      return;
    }
    const newStack = stack.split(n);
    if (stack.count <= 0) {
      this._state.cards = this._state.cards.filter(s => s.id !== stack.id);
    }
    newStack.ratioX = dropX / this._scene.scale.width;
    newStack.ratioY = dropY / this._scene.scale.height;
    this._state.cards.push(newStack);
  }

  _doMerge(src, dst, n) {
    const moved = Math.min(n, src.count);
    dst.count  += moved;
    src.count  -= moved;
    if (src.count <= 0) {
      this._state.cards = this._state.cards.filter(s => s.id !== src.id);
    }
  }

  _doCombine(stackA, stackB) {
    const result = this._engine.combine(stackA, stackB, this._state.mode);
    if (result.error) {
      this._showFeedback(result.error, stackA.ratioX, stackA.ratioY, 'red');
      return;
    }
    this._scene.events.emit('combine:success', { stackA, stackB, recipe: result.recipe });
  }

  _moveStack(stack, x, y) {
    stack.ratioX = x / this._scene.scale.width;
    stack.ratioY = y / this._scene.scale.height;
  }

  _findDropTarget(x, y, exclude) {
    if (!this._scene._spriteMap) return null;
    for (const [id, sp] of this._scene._spriteMap) {
      if (sp.stack.id === exclude.id) continue;
      const bounds = sp.getBounds();
      if (Phaser.Geom.Rectangle.Contains(bounds, x, y)) {
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
      color: color === 'red' ? '#ff0000' : '#00cc00',
      fontStyle: 'bold',
      backgroundColor: '#ffffffcc',
      padding: { x: 6, y: 4 },
    }).setOrigin(0.5).setDepth(200);
    this._scene.time.delayedCall(1500, () => txt.destroy());
  }
}
