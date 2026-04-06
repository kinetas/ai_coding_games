/// All card types in CardForge.
enum CardType {
  // Human
  person,
  warrior,
  // Building
  farmland,
  ruined_farmland,
  land,
  boat,
  wall,
  house,
  village,
  city,
  orchard,
  // Nature
  rock,
  tree,
  rabbit,
  deer,
  // Threat
  wolf,
  bear,
  // Resource
  food,
  stone,
  wood,
  brick,
  seed,
  // Weapon
  spear,
  bow,
  archer,
}

/// High-level grouping for card types.
enum CardCategory {
  human,
  building,
  nature,
  threat,
  resource,
  weapon,
}

/// Static metadata for a card type.
class CardDefinition {
  final CardType type;
  final String name;
  final String icon;
  final CardCategory category;

  /// Seconds until this card auto-removes (null = never auto-removes).
  final double? removalTime;

  /// Seconds for a worker to complete a work action (null = not workable).
  final double? workTime;

  /// CardType of worker that can interact with this card (null = none).
  final CardType? workerType;

  // ── Work result fields ──────────────────────────────────────────────────

  /// Specific resource cards to spawn when work completes.
  final List<CardType>? workResultResources;

  /// Number of random resources (from kRandomResourcePool) to spawn on completion.
  final int workResultRandom;

  /// Whether this card destroys itself after work completes.
  final bool workResultDestroySelf;

  /// Type to transform this card into after work completes (null = no transform).
  final CardType? workResultTransform;

  /// Whether to reset the removal timer to [removalTime] after work completes.
  final bool workResultResetRemoval;

  /// Chance [0.0–1.0] that the assigned worker dies upon work completion.
  final double workerDeathChance;

  /// Type to transform this card into when its removal timer expires (null = disappear).
  final CardType? expiryTransform;

  const CardDefinition({
    required this.type,
    required this.name,
    required this.icon,
    required this.category,
    this.removalTime,
    this.workTime,
    this.workerType,
    this.workResultResources,
    this.workResultRandom = 0,
    this.workResultDestroySelf = false,
    this.workResultTransform,
    this.workResultResetRemoval = false,
    this.workerDeathChance = 0.0,
    this.expiryTransform,
  });
}
