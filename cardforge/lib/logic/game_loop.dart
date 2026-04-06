import 'dart:async';
import 'dart:math';
import 'dart:ui' show Offset;

import 'package:uuid/uuid.dart';

import '../models/card_definitions.dart';
import '../models/card_model.dart';
import '../models/card_type.dart';
import '../models/game_state.dart';
import 'spawn_manager.dart';
import 'win_lose_checker.dart';

/// Hard tick interval: 100 ms → 10 ticks/s.
const _kTickInterval = Duration(milliseconds: 100);

/// Logical dt per tick in seconds (before game-speed scaling).
const _kRawDt = 0.1;

/// Natural spawning pauses when visible cards exceed this limit.
/// Prevents the board from getting overwhelmingly cluttered.
const _kMaxCardsForSpawn = 30;

const _uuid = Uuid();
final _rng = Random();

/// How long (seconds) a spawned threat card lives before dealing expiry damage.
const _threatRemovalTime = {
  CardType.wolf: 45.0,
  CardType.bear: 60.0,
};

/// Wall HP damage applied when the corresponding threat expires untreated.
const _threatExpiryDamage = {
  CardType.wolf: 3,
  CardType.bear: 5,
};

/// Central game loop driven by [Stream.periodic] at 100 ms intervals.
///
/// Tick processing order (per spec):
///   1. Increase [GameState.gameTime]
///   2. Advance per-card timers
///   3. Handle work completion → spawn resources, return/kill worker
///   4. Handle card expiry → expiryTransform or hide + accumulate wall damage
///   5. Apply wall damage
///   6. [SpawnManager.tick] → spawn natural cards
///   7. [WinLoseChecker.check] → update [GameStatus]
class GameLoop {
  final _spawnManager = SpawnManager();
  final _checker = WinLoseChecker();

  final _controller = StreamController<GameState>.broadcast();
  StreamSubscription<void>? _subscription;

  GameState _state;

  GameLoop(GameState initialState) : _state = initialState;

  // ── Public API ────────────────────────────────────────────────────────────

  Stream<GameState> get stateStream => _controller.stream;

  void start() {
    _subscription?.cancel();
    _subscription = Stream.periodic(_kTickInterval).listen((_) {
      if (_state.status != GameStatus.playing) return;
      _state = _processTick(_state);
      _controller.add(_state);
    });
  }

  void pause() {
    _subscription?.cancel();
    _subscription = null;
  }

  void resume() => start();

  void syncState(GameState state) {
    _state = state;
  }

  void dispose() {
    _subscription?.cancel();
    if (!_controller.isClosed) _controller.close();
  }

  // ── Tick processing ───────────────────────────────────────────────────────

  /// Accumulated threat expiry damage for the current tick (reset before use).
  int _pendingDamage = 0;

  GameState _processTick(GameState state) {
    final dt = _kRawDt * state.gameSpeed;
    final newGameTime = state.gameTime + dt;

    final newEvents = <String>[];
    _pendingDamage = 0;

    final cards = state.cards.toList();
    final cardsToAdd = <CardModel>[];

    // ── 2–4. Advance timers; handle work completion & expiry ───────────────
    for (int i = 0; i < cards.length; i++) {
      final card = cards[i];
      if (!card.visible) continue;

      // Removal timer
      if (card.removalTimeLeft != null) {
        final newRemoval = card.removalTimeLeft! - dt;
        if (newRemoval <= 0) {
          _handleExpiry(i, cards, cardsToAdd, newEvents);
          continue; // card has been updated inside _handleExpiry
        }
        cards[i] = cards[i].copyWith(removalTimeLeft: newRemoval);
      }

      // Work timer (only while a worker is assigned)
      if (cards[i].isWorking && cards[i].workTimeLeft != null) {
        final newWork = cards[i].workTimeLeft! - dt;
        if (newWork <= 0) {
          _handleWorkCompletion(i, cards, cardsToAdd, newEvents);
        } else {
          cards[i] = cards[i].copyWith(workTimeLeft: newWork);
        }
      }
    }

    // ── 5. Apply accumulated wall damage ───────────────────────────────────
    final allCards = [...cards, ...cardsToAdd];
    final cardsAfterDamage = _applyWallDamage(allCards, _pendingDamage, newEvents);

    // ── 6. SpawnManager → spawn natural cards (paused when board is full) ──
    final counts = _countVisible(cardsAfterDamage);
    final totalVisible = counts.values.fold(0, (a, b) => a + b);
    final toSpawn = totalVisible < _kMaxCardsForSpawn
        ? _spawnManager.tick(dt, counts)
        : <CardType>[];

    var finalCards = cardsAfterDamage;
    for (final spawnType in toSpawn) {
      finalCards = [
        ...finalCards,
        CardModel(
          id: _uuid.v4(),
          type: spawnType,
          position: _randomBoardPosition(),
          removalTimeLeft: _threatRemovalTime[spawnType],
        ),
      ];
      final name = CARD_DEFS[spawnType]?.name ?? spawnType.name;
      if (_threatRemovalTime.containsKey(spawnType)) {
        newEvents.add('⚠️ $name 이(가) 나타났습니다!');
      } else {
        newEvents.add('🌿 스폰: $name');
      }
    }

    // ── 7. Win/lose check ──────────────────────────────────────────────────
    final newStatus = _checker.check(finalCards, newGameTime);
    if (newStatus == GameStatus.won) {
      newEvents.add('🎉 승리! 도시·성벽·인구 조건을 모두 달성했습니다!');
    } else if (newStatus == GameStatus.lost) {
      newEvents.add('💀 패배! 생존 시간: ${newGameTime.toStringAsFixed(0)}초');
    }

    final updatedLog = [...newEvents, ...state.eventLog].take(50).toList();

    return state.copyWith(
      cards: finalCards,
      gameTime: newGameTime,
      status: newStatus,
      eventLog: updatedLog,
    );
  }

  // ── Expiry handler ────────────────────────────────────────────────────────

  void _handleExpiry(
    int idx,
    List<CardModel> cards,
    List<CardModel> cardsToAdd,
    List<String> events,
  ) {
    final card = cards[idx];
    final def = CARD_DEFS[card.type];
    final name = def?.name ?? card.type.name;

    // Eject any stored worker back to the board
    if (card.storedWorkerId != null) {
      final wIdx = cards.indexWhere((c) => c.id == card.storedWorkerId);
      if (wIdx >= 0 && !cards[wIdx].visible) {
        final workerName =
            CARD_DEFS[cards[wIdx].type]?.name ?? cards[wIdx].type.name;
        cards[wIdx] = cards[wIdx].copyWith(
          visible: true,
          position: _nearbyPosition(card.position),
        );
        events.add('🏃 $workerName 복귀');
      }
    }

    // Threat expiry: accumulate wall damage
    final damage = _threatExpiryDamage[card.type];
    if (damage != null) {
      _pendingDamage += damage;
      events.add('⚔️ $name 미처치 — 성벽에 -$damage HP 피해!');
      cards[idx] = card.copyWith(
        visible: false,
        removalTimeLeft: 0.0,
        isWorking: false,
        workTimeLeft: null,
        storedWorkerId: null,
      );
      return;
    }

    // expiryTransform: card changes type
    if (def?.expiryTransform != null) {
      final newType = def!.expiryTransform!;
      final newDef = CARD_DEFS[newType];
      cards[idx] = card.copyWith(
        type: newType,
        removalTimeLeft: newDef?.removalTime,
        isWorking: false,
        workTimeLeft: null,
        storedWorkerId: null,
      );
      events.add('🔄 $name → ${newDef?.name ?? newType.name}');
      return;
    }

    // Default: card disappears
    cards[idx] = card.copyWith(
      visible: false,
      removalTimeLeft: 0.0,
      isWorking: false,
      workTimeLeft: null,
      storedWorkerId: null,
    );
    events.add('🗑️ $name 이(가) 사라졌습니다');
  }

  // ── Work completion handler ───────────────────────────────────────────────

  void _handleWorkCompletion(
    int buildingIdx,
    List<CardModel> cards,
    List<CardModel> cardsToAdd,
    List<String> events,
  ) {
    final building = cards[buildingIdx];
    final def = CARD_DEFS[building.type];
    if (def == null) return;
    final buildingName = def.name;

    // Spawn specific resources
    if (def.workResultResources != null && def.workResultResources!.isNotEmpty) {
      final names = <String>[];
      for (final resType in def.workResultResources!) {
        cardsToAdd.add(CardModel(
          id: _uuid.v4(),
          type: resType,
          position: _nearbyPosition(building.position),
        ));
        names.add(CARD_DEFS[resType]?.name ?? resType.name);
      }
      events.add('✨ $buildingName: ${names.join(', ')} 획득!');
    }

    // Spawn random resources (boat)
    if (def.workResultRandom > 0) {
      int foodCount = 0, stoneCount = 0, woodCount = 0;
      for (int k = 0; k < def.workResultRandom; k++) {
        final t =
            kRandomResourcePool[_rng.nextInt(kRandomResourcePool.length)];
        cardsToAdd.add(CardModel(
          id: _uuid.v4(),
          type: t,
          position: _nearbyPosition(building.position),
        ));
        if (t == CardType.food) {
          foodCount++;
        } else if (t == CardType.stone) {
          stoneCount++;
        } else {
          woodCount++;
        }
      }
      final parts = [
        if (foodCount > 0) '식량×$foodCount',
        if (stoneCount > 0) '돌×$stoneCount',
        if (woodCount > 0) '목재×$woodCount',
      ];
      events.add('⛵ $buildingName 항해 완료: ${parts.join(', ')} 획득!');
    }

    // Handle worker fate
    final workerId = building.storedWorkerId;
    if (workerId != null) {
      final workerIdx = cards.indexWhere((c) => c.id == workerId);
      if (workerIdx >= 0) {
        final workerCard = cards[workerIdx];
        final workerName =
            CARD_DEFS[workerCard.type]?.name ?? workerCard.type.name;
        final dies = def.workerDeathChance > 0 &&
            _rng.nextDouble() < def.workerDeathChance;
        if (dies) {
          cards[workerIdx] = workerCard.copyWith(visible: false);
          events.add('💀 $workerName 이(가) 전투 중 사망했습니다!');
        } else {
          cards[workerIdx] = workerCard.copyWith(
            visible: true,
            position: _nearbyPosition(building.position),
          );
          events.add('✅ $workerName 작업 완료 및 귀환');
        }
      }
    }

    // Update building state after work
    if (def.workResultDestroySelf) {
      cards[buildingIdx] = building.copyWith(
        visible: false,
        isWorking: false,
        workTimeLeft: null,
        storedWorkerId: null,
      );
    } else if (def.workResultTransform != null) {
      final newType = def.workResultTransform!;
      final newDef = CARD_DEFS[newType];
      cards[buildingIdx] = building.copyWith(
        type: newType,
        isWorking: false,
        workTimeLeft: null,
        storedWorkerId: null,
        removalTimeLeft: newDef?.removalTime,
      );
      events.add('🔄 $buildingName → ${newDef?.name ?? newType.name}');
    } else if (def.workResultResetRemoval && def.removalTime != null) {
      cards[buildingIdx] = building.copyWith(
        isWorking: false,
        workTimeLeft: null,
        storedWorkerId: null,
        removalTimeLeft: def.removalTime,
      );
    } else {
      cards[buildingIdx] = building.copyWith(
        isWorking: false,
        workTimeLeft: null,
        storedWorkerId: null,
      );
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  List<CardModel> _applyWallDamage(
    List<CardModel> cards,
    int damage,
    List<String> events,
  ) {
    if (damage <= 0) return cards;

    final result = cards.toList();
    int remaining = damage;

    for (int i = 0; i < result.length && remaining > 0; i++) {
      final c = result[i];
      if (!c.visible || c.type != CardType.wall) continue;

      if (c.hp <= remaining) {
        remaining -= c.hp;
        result[i] = c.copyWith(hp: 0, visible: false);
        events.add('🏚️ 성벽이 파괴되었습니다!');
      } else {
        result[i] = c.copyWith(hp: c.hp - remaining);
        events.add('🛡️ 성벽이 피해 흡수 (HP: ${c.hp - remaining})');
        remaining = 0;
      }
    }

    // No wall: destroy a random non-threat card
    if (remaining > 0) {
      final targets = result
          .where((c) =>
              c.visible &&
              c.type != CardType.wall &&
              CARD_DEFS[c.type]?.category != CardCategory.threat)
          .toList();
      while (remaining > 0 && targets.isNotEmpty) {
        final victim = targets[_rng.nextInt(targets.length)];
        final vIdx = result.indexWhere((c) => c.id == victim.id);
        if (vIdx >= 0) {
          result[vIdx] = result[vIdx].copyWith(visible: false);
          events.add(
              '💥 ${CARD_DEFS[victim.type]?.name ?? victim.type.name} 파괴됨!');
          targets.remove(victim);
        }
        remaining--;
      }
    }

    return result;
  }

  Map<CardType, int> _countVisible(List<CardModel> cards) {
    final counts = <CardType, int>{};
    for (final c in cards) {
      if (c.visible) counts[c.type] = (counts[c.type] ?? 0) + 1;
    }
    return counts;
  }

  Offset _randomBoardPosition() {
    return Offset(
      0.1 + _rng.nextDouble() * 0.8,
      0.1 + _rng.nextDouble() * 0.8,
    );
  }

  /// Position near [base], offset ~8% of the board in a random direction.
  Offset _nearbyPosition(Offset base) {
    const d = 0.08;
    final angle = _rng.nextDouble() * 2 * pi;
    return Offset(
      (base.dx + cos(angle) * d).clamp(0.05, 0.95),
      (base.dy + sin(angle) * d).clamp(0.05, 0.95),
    );
  }
}
