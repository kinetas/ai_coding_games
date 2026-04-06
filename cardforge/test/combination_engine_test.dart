import 'package:flutter_test/flutter_test.dart';
import 'package:cardforge/logic/combination_engine.dart';
import 'package:cardforge/models/card_type.dart';

void main() {
  const engine = CombinationEngine();

  // ---------------------------------------------------------------------------
  // Helper
  // ---------------------------------------------------------------------------
  CombinationResult resolveOrFail(CardType a, CardType b) {
    final result = engine.resolve(a, b);
    expect(result, isNotNull,
        reason: 'Expected a result for ${a.name} + ${b.name}');
    return result!;
  }

  // ---------------------------------------------------------------------------
  // All 11 standard recipes — both forward and reversed
  // ---------------------------------------------------------------------------
  group('Standard recipes — forward order', () {
    test('돌 + 돌 → 벽돌', () {
      final r = resolveOrFail(CardType.stone, CardType.stone);
      expect(r.outputType, CardType.brick);
      expect(r.consumeA, isTrue);
      expect(r.consumeB, isTrue);
      expect(r.hpBonus, 0);
    });

    test('벽돌 + 벽돌 → 성벽', () {
      final r = resolveOrFail(CardType.brick, CardType.brick);
      expect(r.outputType, CardType.wall);
      expect(r.consumeA, isTrue);
      expect(r.consumeB, isTrue);
    });

    test('목재 + 돌 → 창', () {
      final r = resolveOrFail(CardType.wood, CardType.stone);
      expect(r.outputType, CardType.spear);
    });

    test('목재 + 목재 → 배', () {
      final r = resolveOrFail(CardType.wood, CardType.wood);
      expect(r.outputType, CardType.boat);
    });

    test('식량 + 식량 → 씨앗', () {
      final r = resolveOrFail(CardType.food, CardType.food);
      expect(r.outputType, CardType.seed);
    });

    test('씨앗 + 농지 → 과수원', () {
      final r = resolveOrFail(CardType.seed, CardType.farmland);
      expect(r.outputType, CardType.orchard);
    });

    test('창 + 창 → 활', () {
      final r = resolveOrFail(CardType.spear, CardType.spear);
      expect(r.outputType, CardType.bow);
    });

    test('활 + 전사 → 궁수', () {
      final r = resolveOrFail(CardType.bow, CardType.warrior);
      expect(r.outputType, CardType.archer);
    });

    test('벽돌 + 나무 → 목조 가옥', () {
      final r = resolveOrFail(CardType.brick, CardType.tree);
      expect(r.outputType, CardType.house);
    });

    test('목조 가옥 + 목조 가옥 → 마을', () {
      final r = resolveOrFail(CardType.house, CardType.house);
      expect(r.outputType, CardType.village);
    });

    test('마을 + 마을 → 도시', () {
      final r = resolveOrFail(CardType.village, CardType.village);
      expect(r.outputType, CardType.city);
    });
  });

  // ---------------------------------------------------------------------------
  // Order-agnostic (reversed) matching
  // ---------------------------------------------------------------------------
  group('Reversed order matching', () {
    test('돌 + 목재 → 창 (reversed)', () {
      final r = resolveOrFail(CardType.stone, CardType.wood);
      expect(r.outputType, CardType.spear);
    });

    test('농지 + 씨앗 → 과수원 (reversed)', () {
      final r = resolveOrFail(CardType.farmland, CardType.seed);
      expect(r.outputType, CardType.orchard);
    });

    test('전사 + 활 → 궁수 (reversed)', () {
      final r = resolveOrFail(CardType.warrior, CardType.bow);
      expect(r.outputType, CardType.archer);
    });

    test('나무 + 벽돌 → 목조 가옥 (reversed)', () {
      final r = resolveOrFail(CardType.tree, CardType.brick);
      expect(r.outputType, CardType.house);
    });
  });

  // ---------------------------------------------------------------------------
  // Null results for unknown combinations
  // ---------------------------------------------------------------------------
  group('Unknown combinations return null', () {
    test('사람 + 돌 → null', () {
      expect(engine.resolve(CardType.person, CardType.stone), isNull);
    });

    test('늑대 + 곰 → null', () {
      expect(engine.resolve(CardType.wolf, CardType.bear), isNull);
    });

    test('도시 + 도시 → null', () {
      expect(engine.resolve(CardType.city, CardType.city), isNull);
    });
  });

  // ---------------------------------------------------------------------------
  // Special case: 성벽 수리 (벽돌 + 성벽 → 성벽 HP+3)
  // ---------------------------------------------------------------------------
  group('Wall repair — special case', () {
    test('벽돌(a) + 성벽(b) → 성벽 유지, 벽돌 소모, HP+3', () {
      final r = resolveOrFail(CardType.brick, CardType.wall);
      expect(r.outputType, CardType.wall);
      expect(r.consumeA, isTrue,  reason: '벽돌(a)은 소모되어야 함');
      expect(r.consumeB, isFalse, reason: '성벽(b)은 유지되어야 함');
      expect(r.hpBonus, 3);
      expect(r.isRepair, isTrue);
    });

    test('성벽(a) + 벽돌(b) → 성벽 유지, 벽돌 소모, HP+3 (reversed)', () {
      final r = resolveOrFail(CardType.wall, CardType.brick);
      expect(r.outputType, CardType.wall);
      // In reversed order: a=wall maps to rule.inputB (consumeB=false),
      //                    b=brick maps to rule.inputA (consumeA=true).
      expect(r.consumeA, isFalse, reason: '성벽(a)은 유지되어야 함 (reversed)');
      expect(r.consumeB, isTrue,  reason: '벽돌(b)은 소모되어야 함 (reversed)');
      expect(r.hpBonus, 3);
      expect(r.isRepair, isTrue);
    });
  });
}
