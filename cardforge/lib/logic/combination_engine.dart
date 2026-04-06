import '../models/card_type.dart';
import 'combinations.dart';

/// The resolved outcome of a successful card combination.
class CombinationResult {
  /// The card type to produce (or the surviving card type for repair).
  final CardType outputType;

  /// Whether input-A card should be removed.
  final bool consumeA;

  /// Whether input-B card should be removed.
  final bool consumeB;

  /// HP to add to the output / surviving card (0 = normal creation at full HP).
  final int hpBonus;

  /// True when this combination modifies an existing card rather than creating
  /// a new one (e.g. wall repair).
  bool get isRepair => !consumeB || !consumeA;

  const CombinationResult({
    required this.outputType,
    required this.consumeA,
    required this.consumeB,
    required this.hpBonus,
  });

  @override
  String toString() =>
      'CombinationResult(output: $outputType, consumeA: $consumeA, '
      'consumeB: $consumeB, hpBonus: $hpBonus)';
}

/// Pure-logic engine that resolves card combinations against [COMBINATION_TABLE].
///
/// This class has no state and no Flutter dependencies — it can be tested
/// without a widget environment.
class CombinationEngine {
  const CombinationEngine();

  /// Returns the [CombinationResult] for combining [a] and [b], or `null` if
  /// no matching recipe exists.
  ///
  /// Matching is order-agnostic: `resolve(a, b) == resolve(b, a)`.
  /// When the rule is found via the reversed order (b, a), [consumeA] and
  /// [consumeB] are swapped so the caller always knows which of its two
  /// original cards to consume.
  CombinationResult? resolve(CardType a, CardType b) {
    for (final rule in COMBINATION_TABLE) {
      // Direct match: a == inputA, b == inputB
      if (rule.inputA == a && rule.inputB == b) {
        return CombinationResult(
          outputType: rule.output,
          consumeA: rule.consumeA,
          consumeB: rule.consumeB,
          hpBonus: rule.hpBonus,
        );
      }

      // Reversed match: a == inputB, b == inputA
      // Swap consumeA/consumeB so they still refer to the caller's (a, b) order.
      if (rule.inputA == b && rule.inputB == a) {
        return CombinationResult(
          outputType: rule.output,
          consumeA: rule.consumeB, // a maps to inputB → use rule.consumeB
          consumeB: rule.consumeA, // b maps to inputA → use rule.consumeA
          hpBonus: rule.hpBonus,
        );
      }
    }
    return null;
  }
}

/// Convenience singleton — use this rather than constructing a new instance.
const combinationEngine = CombinationEngine();
