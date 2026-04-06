import 'dart:ui' show Offset;

import 'package:uuid/uuid.dart';

import '../models/card_definitions.dart';
import '../models/card_model.dart';
import '../models/card_type.dart';
import '../models/game_state.dart';
import 'combination_engine.dart';

const _uuid = Uuid();

// ── Public API ───────────────────────────────────────────────────────────────

/// Returns true when [dragger] can interact with [target] in any supported way:
/// combination-table match, work assignment, breeding, or spear→warrior.
///
/// Call this from [DragTarget.onWillAcceptWithDetails] to decide glow/accept.
bool canInteract(CardModel dragger, CardModel target) {
  if (dragger.id == target.id) return false;
  if (!dragger.visible || !target.visible) return false;

  // 1. Standard combination table
  if (combinationEngine.resolve(dragger.type, target.type) != null) return true;

  // 2. Work assignment (person/warrior → workable building)
  if (_isWorkAssignment(dragger, target)) return true;

  // 3. Breeding: person + person
  if (dragger.type == CardType.person && target.type == CardType.person) return true;

  // 4. Spear + person → warrior conversion
  if (_isSpearConversion(dragger, target)) return true;

  return false;
}

/// Executes a drag-drop interaction between [dragger] and [target].
///
/// Resolves in priority order:
///   1. Combination-table recipe
///   2. Work assignment
///   3. Breeding (person + person)
///   4. Spear + person → warrior
///
/// Returns an updated [GameState] with cards modified and log entries prepended.
/// The caller is responsible for passing the result to [GameNotifier.applyExternalUpdate].
GameState executeInteraction(
    CardModel dragger, CardModel target, GameState state) {
  if (dragger.id == target.id) return state;
  if (!dragger.visible || !target.visible) return state;

  final newEvents = <String>[];
  final cards = state.cards.toList();

  // ── 1. Combination table ─────────────────────────────────────────────────
  final result = combinationEngine.resolve(dragger.type, target.type);
  if (result != null) {
    return _applyCombination(dragger, target, result, cards, state, newEvents);
  }

  // ── 2. Work assignment ───────────────────────────────────────────────────
  if (_isWorkAssignment(dragger, target)) {
    return _applyWorkAssignment(dragger, target, cards, state, newEvents);
  }

  // ── 3. Breeding: person + person → new person (costs 1 food) ─────────────
  if (dragger.type == CardType.person && target.type == CardType.person) {
    return _applyBreeding(dragger, target, cards, state, newEvents);
  }

  // ── 4. Spear + person → warrior ───────────────────────────────────────────
  if (_isSpearConversion(dragger, target)) {
    final person = dragger.type == CardType.person ? dragger : target;
    final spear = dragger.type == CardType.spear ? dragger : target;
    return _applySpearConversion(person, spear, cards, state, newEvents);
  }

  return state;
}

// ── Predicate helpers ─────────────────────────────────────────────────────────

bool _isWorkAssignment(CardModel dragger, CardModel target) {
  if (target.isWorking) return false;
  final def = CARD_DEFS[target.type];
  return def?.workerType == dragger.type;
}

bool _isSpearConversion(CardModel dragger, CardModel target) {
  return (dragger.type == CardType.spear && target.type == CardType.person) ||
      (dragger.type == CardType.person && target.type == CardType.spear);
}

// ── Interaction implementations ───────────────────────────────────────────────

GameState _applyCombination(
  CardModel dragger,
  CardModel target,
  CombinationResult result,
  List<CardModel> cards,
  GameState state,
  List<String> newEvents,
) {
  final midPos = Offset(
    (dragger.position.dx + target.position.dx) / 2,
    (dragger.position.dy + target.position.dy) / 2,
  );

  List<CardModel> updated;

  if (!result.consumeB) {
    // Repair: consume dragger (brick), add HP to target (wall)
    updated = cards.map((c) {
      if (c.id == dragger.id && result.consumeA) return c.copyWith(visible: false);
      if (c.id == target.id) return c.copyWith(hp: (c.hp + result.hpBonus).clamp(0, 20));
      return c;
    }).toList();
    newEvents.add('🔧 수리: ${_name(target.type)} HP +${result.hpBonus}');
  } else {
    // Normal combination: remove consumed cards, create result card
    updated = cards.map((c) {
      if (result.consumeA && c.id == dragger.id) return c.copyWith(visible: false);
      if (result.consumeB && c.id == target.id) return c.copyWith(visible: false);
      return c;
    }).toList();
    updated.add(CardModel(
      id: _uuid.v4(),
      type: result.outputType,
      position: midPos,
    ));
    newEvents.add(
        '✨ 조합: ${_name(dragger.type)} + ${_name(target.type)} → ${_name(result.outputType)}');
  }

  return _withLog(state, updated, newEvents);
}

GameState _applyWorkAssignment(
  CardModel worker,
  CardModel building,
  List<CardModel> cards,
  GameState state,
  List<String> newEvents,
) {
  final def = CARD_DEFS[building.type]!;
  final updated = cards.map((c) {
    if (c.id == building.id) {
      return c.copyWith(
        isWorking: true,
        workTimeLeft: def.workTime,
        storedWorkerId: worker.id,
      );
    }
    // Hide the worker card while it is assigned
    if (c.id == worker.id) return c.copyWith(visible: false);
    return c;
  }).toList();

  newEvents.add('🔨 작업 배치: ${_name(worker.type)} → ${_name(building.type)}');
  return _withLog(state, updated, newEvents);
}

GameState _applyBreeding(
  CardModel personA,
  CardModel personB,
  List<CardModel> cards,
  GameState state,
  List<String> newEvents,
) {
  // Consume one visible food card
  final foodIdx = cards.indexWhere((c) => c.visible && c.type == CardType.food);
  if (foodIdx < 0) {
    newEvents.add('🍖 식량 부족 — 번식 실패');
    return _withLog(state, cards, newEvents);
  }

  final midPos = Offset(
    (personA.position.dx + personB.position.dx) / 2,
    (personA.position.dy + personB.position.dy) / 2,
  );

  final updated = cards.toList();
  updated[foodIdx] = updated[foodIdx].copyWith(visible: false);
  updated.add(CardModel(id: _uuid.v4(), type: CardType.person, position: midPos));

  newEvents.add('👶 번식: 새 사람 탄생 (식량 1 소모)');
  return _withLog(state, updated, newEvents);
}

GameState _applySpearConversion(
  CardModel person,
  CardModel spear,
  List<CardModel> cards,
  GameState state,
  List<String> newEvents,
) {
  final updated = cards.map((c) {
    if (c.id == person.id) return c.copyWith(type: CardType.warrior);
    if (c.id == spear.id) return c.copyWith(visible: false);
    return c;
  }).toList();

  newEvents.add('⚔️ 변환: 사람 + 창 → 전사');
  return _withLog(state, updated, newEvents);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

GameState _withLog(
    GameState state, List<CardModel> cards, List<String> newEvents) {
  return state.copyWith(
    cards: cards,
    eventLog: [...newEvents, ...state.eventLog].take(50).toList(),
  );
}

String _name(CardType type) => CARD_DEFS[type]?.name ?? type.name;
