import 'dart:math' show Random;
import 'dart:ui' show Offset;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../models/card_definitions.dart';
import '../models/card_model.dart';
import '../models/card_type.dart';
import '../models/game_state.dart';
import '../logic/game_loop.dart';

const _uuid = Uuid();
final _rng = Random();

/// Riverpod notifier that owns the [GameLoop] and exposes [GameState].
///
/// UI layer should call [startNewGame] or [loadGame] to begin play.
/// External state mutations (drag-and-drop, etc.) must go through
/// [applyExternalUpdate] so the loop stays in sync.
class GameNotifier extends Notifier<GameState> {
  GameLoop? _loop;

  @override
  GameState build() {
    ref.onDispose(_cleanup);
    return const GameState();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /// Start a fresh game with the default initial board.
  void startNewGame() {
    _cleanup();
    final initial = _buildInitialState();
    state = initial;
    _attach(initial);
  }

  /// Resume from a previously serialised [GameState] (save/load).
  void loadGame(GameState saved) {
    _cleanup();
    state = saved;
    _attach(saved);
  }

  void pauseGame() => _loop?.pause();

  void resumeGame() => _loop?.resume();

  /// Change game speed multiplier (1, 2, 5, or 10).
  void setSpeed(double speed) {
    final next = state.copyWith(gameSpeed: speed);
    state = next;
    _loop?.syncState(next);
  }

  /// Spawn a new card of [type] near the centre of the board.
  void addCard(CardType type) {
    final x = 0.35 + _rng.nextDouble() * 0.3;
    final y = 0.35 + _rng.nextDouble() * 0.3;
    final newCard = CardModel(
      id: _uuid.v4(),
      type: type,
      position: Offset(x, y),
    );
    final next = state.copyWith(cards: [...state.cards, newCard]);
    state = next;
    _loop?.syncState(next);
  }

  /// Apply a state change made outside the loop (e.g. drag-and-drop combine).
  ///
  /// Keeps the loop's internal snapshot in sync with Riverpod state.
  void applyExternalUpdate(GameState newState) {
    state = newState;
    _loop?.syncState(newState);
  }

  /// Arrange all visible cards into a neat grid so the board is easier to read.
  ///
  /// Cards are sorted by category then type, then laid out left→right, top→bottom
  /// with a small top margin to leave room for the TopBar.
  void tidyBoard() {
    final visible = state.cards.where((c) => c.visible).toList();

    // Sort: humans first, then buildings, resources, weapons, nature, threats
    const order = [
      CardCategory.human,
      CardCategory.building,
      CardCategory.resource,
      CardCategory.weapon,
      CardCategory.nature,
      CardCategory.threat,
    ];
    visible.sort((a, b) {
      final aCat = CARD_DEFS[a.type]?.category ?? CardCategory.nature;
      final bCat = CARD_DEFS[b.type]?.category ?? CardCategory.nature;
      final catCmp = order.indexOf(aCat).compareTo(order.indexOf(bCat));
      if (catCmp != 0) return catCmp;
      return a.type.index.compareTo(b.type.index);
    });

    const cols = 8;
    const colStep = 0.115;   // horizontal gap between cards
    const rowStep = 0.22;    // vertical gap between cards
    const startX = 0.03;
    const startY = 0.14;     // below TopBar

    final updatedIds = <String, Offset>{};
    for (int i = 0; i < visible.length; i++) {
      final col = i % cols;
      final row = i ~/ cols;
      updatedIds[visible[i].id] = Offset(
        startX + col * colStep,
        startY + row * rowStep,
      );
    }

    final newCards = state.cards.map((c) {
      final pos = updatedIds[c.id];
      return pos != null ? c.copyWith(position: pos) : c;
    }).toList();

    final next = state.copyWith(cards: newCards);
    state = next;
    _loop?.syncState(next);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  void _attach(GameState initial) {
    final loop = GameLoop(initial);
    _loop = loop;
    loop.stateStream.listen((updated) {
      state = updated;
    });
    loop.start();
  }

  void _cleanup() {
    _loop?.dispose();
    _loop = null;
  }

  /// Initial board: 2 people, 1 warrior, wood, stone, food.
  GameState _buildInitialState() {
    return GameState(
      cards: [
        _card(CardType.person,  0.20, 0.50),
        _card(CardType.person,  0.35, 0.40),
        _card(CardType.warrior, 0.50, 0.55),
        _card(CardType.food,    0.65, 0.40),
        _card(CardType.wood,    0.20, 0.70),
        _card(CardType.stone,   0.80, 0.60),
      ],
    );
  }

  CardModel _card(CardType type, double x, double y) {
    return CardModel(
      id: _uuid.v4(),
      type: type,
      position: Offset(x, y),
    );
  }
}

/// Global provider — reference this in widgets and other providers.
final gameProvider =
    NotifierProvider<GameNotifier, GameState>(GameNotifier.new);
