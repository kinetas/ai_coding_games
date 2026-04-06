import 'dart:math';
import '../models/card_type.dart';

/// Static configuration for one card type's natural spawn schedule.
class SpawnConfig {
  final CardType type;

  /// Minimum seconds between consecutive spawns of this type.
  final double minInterval;

  /// Maximum seconds between consecutive spawns of this type.
  final double maxInterval;

  /// Maximum number of this card type allowed on the board at once.
  final int cap;

  /// Seconds before the very first spawn of this type.
  final double initialDelay;

  const SpawnConfig({
    required this.type,
    required this.minInterval,
    required this.maxInterval,
    required this.cap,
    required this.initialDelay,
  });
}

/// Natural-spawn schedule for all spawnable card types.
///
/// To add a new spawnable: append an entry here — no other file changes needed.
const List<SpawnConfig> SPAWN_TABLE = [
  SpawnConfig(type: CardType.rock,   minInterval: 60,  maxInterval: 120, cap: 3, initialDelay: 20),
  SpawnConfig(type: CardType.tree,   minInterval: 45,  maxInterval: 90,  cap: 3, initialDelay: 10),
  SpawnConfig(type: CardType.rabbit, minInterval: 40,  maxInterval: 80,  cap: 3, initialDelay: 20),
  SpawnConfig(type: CardType.deer,   minInterval: 60,  maxInterval: 120, cap: 2, initialDelay: 30),
  SpawnConfig(type: CardType.wolf,   minInterval: 90,  maxInterval: 150, cap: 2, initialDelay: 60),
  SpawnConfig(type: CardType.bear,   minInterval: 120, maxInterval: 240, cap: 1, initialDelay: 120),
];

/// Manages per-type countdown timers for natural spawning.
///
/// Call [tick] every game-loop iteration with the elapsed [dt] (in seconds,
/// already scaled by game speed) and the current visible card counts.
/// Returns the list of [CardType]s that should be spawned this tick.
class SpawnManager {
  final _random = Random();
  final Map<CardType, double> _timers = {};

  SpawnManager() {
    _initTimers();
  }

  void _initTimers() {
    for (final cfg in SPAWN_TABLE) {
      _timers[cfg.type] = cfg.initialDelay;
    }
  }

  /// Advance all timers by [dt] seconds.
  ///
  /// Returns [CardType]s ready to spawn (respects [SpawnConfig.cap]).
  List<CardType> tick(double dt, Map<CardType, int> currentCounts) {
    final toSpawn = <CardType>[];

    for (final cfg in SPAWN_TABLE) {
      final remaining = (_timers[cfg.type] ?? cfg.initialDelay) - dt;

      if (remaining <= 0) {
        final count = currentCounts[cfg.type] ?? 0;
        if (count < cfg.cap) {
          toSpawn.add(cfg.type);
        }
        // Always reset timer so the next window is fresh
        _timers[cfg.type] = _nextInterval(cfg);
      } else {
        _timers[cfg.type] = remaining;
      }
    }

    return toSpawn;
  }

  /// Resets all timers to initial delays (call when starting a new game).
  void reset() {
    _timers.clear();
    _initTimers();
  }

  double _nextInterval(SpawnConfig cfg) {
    return cfg.minInterval +
        _random.nextDouble() * (cfg.maxInterval - cfg.minInterval);
  }
}
