import '../models/card_model.dart';
import '../models/card_type.dart';
import '../models/game_state.dart';

/// Pure-logic checker for win and lose conditions.
///
/// This class is stateless and can be unit-tested without a widget environment.
class WinLoseChecker {
  const WinLoseChecker();

  /// Evaluates the current board and returns the appropriate [GameStatus].
  ///
  /// Win  : city >= 1  AND  wall >= 2  AND  (person + warrior) >= 10
  /// Lose : (person + warrior) == 0  (grace period: first 30 s are skipped
  ///         so an empty starting board doesn't trigger immediate game-over)
  GameStatus check(List<CardModel> cards, double gameTime) {
    final visible = cards.where((c) => c.visible);

    final population = visible
        .where((c) => c.type == CardType.person || c.type == CardType.warrior)
        .length;

    // ── Lose condition ────────────────────────────────────────────────────
    // 30 s grace period allows the initial board to be set up.
    if (gameTime > 30.0 && population == 0) {
      return GameStatus.lost;
    }

    // ── Win condition ─────────────────────────────────────────────────────
    final cityCount = visible.where((c) => c.type == CardType.city).length;
    final wallCount = visible.where((c) => c.type == CardType.wall).length;

    if (cityCount >= 1 && wallCount >= 2 && population >= 10) {
      return GameStatus.won;
    }

    return GameStatus.playing;
  }
}

/// Convenience singleton.
const winLoseChecker = WinLoseChecker();
