import '../models/card_type.dart';

/// A single combination recipe.
///
/// [consumeA] / [consumeB] control whether each input card is removed on success.
/// [hpBonus] adds HP to the surviving/output card (used for wall repair).
class CombinationRule {
  final CardType inputA;
  final CardType inputB;
  final CardType output;
  final bool consumeA;
  final bool consumeB;

  /// Extra HP added to the result card (0 = normal).
  final int hpBonus;

  const CombinationRule({
    required this.inputA,
    required this.inputB,
    required this.output,
    this.consumeA = true,
    this.consumeB = true,
    this.hpBonus = 0,
  });
}

/// All valid combination recipes.
///
/// Ordering of inputA / inputB does NOT matter — [CombinationEngine] checks
/// both orders automatically.
/// Add new recipes here; no changes to UI or engine code are needed.
const List<CombinationRule> COMBINATION_TABLE = [
  // 돌 + 돌 → 벽돌
  CombinationRule(inputA: CardType.stone, inputB: CardType.stone, output: CardType.brick),
  // 벽돌 + 벽돌 → 성벽
  CombinationRule(inputA: CardType.brick, inputB: CardType.brick, output: CardType.wall),
  // 목재 + 돌 → 창
  CombinationRule(inputA: CardType.wood, inputB: CardType.stone, output: CardType.spear),
  // 목재 + 목재 → 배
  CombinationRule(inputA: CardType.wood, inputB: CardType.wood, output: CardType.boat),
  // 식량 + 식량 → 씨앗
  CombinationRule(inputA: CardType.food, inputB: CardType.food, output: CardType.seed),
  // 씨앗 + 농지 → 과수원
  CombinationRule(inputA: CardType.seed, inputB: CardType.farmland, output: CardType.orchard),
  // 창 + 창 → 활
  CombinationRule(inputA: CardType.spear, inputB: CardType.spear, output: CardType.bow),
  // 활 + 전사 → 궁수
  CombinationRule(inputA: CardType.bow, inputB: CardType.warrior, output: CardType.archer),
  // 벽돌 + 나무 → 목조 가옥
  CombinationRule(inputA: CardType.brick, inputB: CardType.tree, output: CardType.house),
  // 목조 가옥 + 목조 가옥 → 마을
  CombinationRule(inputA: CardType.house, inputB: CardType.house, output: CardType.village),
  // 마을 + 마을 → 도시
  CombinationRule(inputA: CardType.village, inputB: CardType.village, output: CardType.city),
  // 벽돌 + 성벽 → 성벽 수리 (HP +3, 성벽 유지)
  CombinationRule(
    inputA: CardType.brick,
    inputB: CardType.wall,
    output: CardType.wall,
    consumeA: true,   // 벽돌 소모
    consumeB: false,  // 성벽은 유지
    hpBonus: 3,
  ),
];
