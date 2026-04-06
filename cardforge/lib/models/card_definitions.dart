import 'card_type.dart';

/// Random resource pool for boat work completion.
const kRandomResourcePool = [CardType.food, CardType.stone, CardType.wood];

/// Central registry of all card definitions.
/// To add a new card: add its CardType enum value and add an entry here.
const Map<CardType, CardDefinition> CARD_DEFS = {
  // ── Human ──────────────────────────────────────────────────────────────
  CardType.person: CardDefinition(
    type: CardType.person,
    name: '사람',
    icon: '🧑',
    category: CardCategory.human,
  ),
  CardType.warrior: CardDefinition(
    type: CardType.warrior,
    name: '전사',
    icon: '⚔️',
    category: CardCategory.human,
  ),

  // ── Building ───────────────────────────────────────────────────────────
  CardType.farmland: CardDefinition(
    type: CardType.farmland,
    name: '농지',
    icon: '🌾',
    category: CardCategory.building,
    removalTime: 120.0,
    workTime: 30.0,
    workerType: CardType.person,
    workResultResources: [CardType.food],
    workResultResetRemoval: true,
    expiryTransform: CardType.ruined_farmland,
  ),
  CardType.ruined_farmland: CardDefinition(
    type: CardType.ruined_farmland,
    name: '황무지',
    icon: '🏜️',
    category: CardCategory.building,
    removalTime: 60.0,
    workTime: 30.0,
    workerType: CardType.person,
    workResultTransform: CardType.farmland,
    expiryTransform: CardType.land,
  ),
  CardType.land: CardDefinition(
    type: CardType.land,
    name: '땅',
    icon: '🟫',
    category: CardCategory.building,
    workTime: 30.0,
    workerType: CardType.person,
    workResultTransform: CardType.farmland,
  ),
  CardType.boat: CardDefinition(
    type: CardType.boat,
    name: '배',
    icon: '⛵',
    category: CardCategory.building,
    removalTime: 300.0,
    workTime: 60.0,
    workerType: CardType.person,
    workResultRandom: 5,
    workResultResetRemoval: true,
  ),
  CardType.wall: CardDefinition(
    type: CardType.wall,
    name: '성벽',
    icon: '🧱',
    category: CardCategory.building,
  ),
  CardType.house: CardDefinition(
    type: CardType.house,
    name: '목조 가옥',
    icon: '🏠',
    category: CardCategory.building,
  ),
  CardType.village: CardDefinition(
    type: CardType.village,
    name: '마을',
    icon: '🏘️',
    category: CardCategory.building,
  ),
  CardType.city: CardDefinition(
    type: CardType.city,
    name: '도시',
    icon: '🏙️',
    category: CardCategory.building,
  ),
  CardType.orchard: CardDefinition(
    type: CardType.orchard,
    name: '과수원',
    icon: '🍎',
    category: CardCategory.building,
    workTime: 20.0,
    workerType: CardType.person,
    workResultResources: [CardType.food, CardType.food],
    workResultResetRemoval: true,
  ),

  // ── Nature ─────────────────────────────────────────────────────────────
  CardType.rock: CardDefinition(
    type: CardType.rock,
    name: '바위',
    icon: '🪨',
    category: CardCategory.nature,
    removalTime: 300.0,
    workTime: 60.0,
    workerType: CardType.person,
    workResultResources: [CardType.stone, CardType.stone],
    workResultDestroySelf: true,
  ),
  CardType.tree: CardDefinition(
    type: CardType.tree,
    name: '나무',
    icon: '🌳',
    category: CardCategory.nature,
    removalTime: 300.0,
    workTime: 60.0,
    workerType: CardType.person,
    workResultResources: [CardType.wood, CardType.wood],
    workResultDestroySelf: true,
  ),
  CardType.rabbit: CardDefinition(
    type: CardType.rabbit,
    name: '토끼',
    icon: '🐇',
    category: CardCategory.nature,
    removalTime: 60.0,
    workTime: 10.0,
    workerType: CardType.warrior,
    workResultResources: [CardType.food],
    workResultDestroySelf: true,
  ),
  CardType.deer: CardDefinition(
    type: CardType.deer,
    name: '사슴',
    icon: '🦌',
    category: CardCategory.nature,
    removalTime: 90.0,
    workTime: 30.0,
    workerType: CardType.warrior,
    workResultResources: [CardType.food, CardType.food],
    workResultDestroySelf: true,
  ),

  // ── Threat ─────────────────────────────────────────────────────────────
  CardType.wolf: CardDefinition(
    type: CardType.wolf,
    name: '늑대',
    icon: '🐺',
    category: CardCategory.threat,
    workTime: 30.0,
    workerType: CardType.warrior,
    workResultResources: [CardType.food, CardType.food],
    workResultDestroySelf: true,
    workerDeathChance: 0.15,
  ),
  CardType.bear: CardDefinition(
    type: CardType.bear,
    name: '곰',
    icon: '🐻',
    category: CardCategory.threat,
    workTime: 30.0,
    workerType: CardType.warrior,
    workResultResources: [CardType.food, CardType.food, CardType.food],
    workResultDestroySelf: true,
    workerDeathChance: 0.30,
  ),

  // ── Resource ───────────────────────────────────────────────────────────
  CardType.food: CardDefinition(
    type: CardType.food,
    name: '식량',
    icon: '🍖',
    category: CardCategory.resource,
    removalTime: 120.0,
  ),
  CardType.stone: CardDefinition(
    type: CardType.stone,
    name: '돌',
    icon: '🪨',
    category: CardCategory.resource,
  ),
  CardType.wood: CardDefinition(
    type: CardType.wood,
    name: '목재',
    icon: '🪵',
    category: CardCategory.resource,
  ),
  CardType.brick: CardDefinition(
    type: CardType.brick,
    name: '벽돌',
    icon: '🧱',
    category: CardCategory.resource,
  ),
  CardType.seed: CardDefinition(
    type: CardType.seed,
    name: '씨앗',
    icon: '🌱',
    category: CardCategory.resource,
  ),

  // ── Weapon ─────────────────────────────────────────────────────────────
  CardType.spear: CardDefinition(
    type: CardType.spear,
    name: '창',
    icon: '🗡️',
    category: CardCategory.weapon,
  ),
  CardType.bow: CardDefinition(
    type: CardType.bow,
    name: '활',
    icon: '🏹',
    category: CardCategory.weapon,
  ),
  CardType.archer: CardDefinition(
    type: CardType.archer,
    name: '궁수',
    icon: '🏹',
    category: CardCategory.human,
  ),
};
