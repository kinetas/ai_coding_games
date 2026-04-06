import 'dart:ui' show Offset;
import 'card_type.dart';

/// Represents a single card instance on the game board.
class CardModel {
  final String id;
  final CardType type;
  final Offset position;

  /// Remaining seconds before this card auto-removes (null = never).
  final double? removalTimeLeft;

  /// Remaining seconds until the current work action completes (null = idle).
  final double? workTimeLeft;

  /// Whether a worker is currently assigned to this card.
  final bool isWorking;

  /// ID of the worker card assigned to this card (null if none).
  final String? storedWorkerId;

  /// Current hit points (used for threats and buildings under attack).
  final int hp;

  /// Whether the card is visible on the board.
  final bool visible;

  const CardModel({
    required this.id,
    required this.type,
    required this.position,
    this.removalTimeLeft,
    this.workTimeLeft,
    this.isWorking = false,
    this.storedWorkerId,
    this.hp = 10,
    this.visible = true,
  });

  CardModel copyWith({
    String? id,
    CardType? type,
    Offset? position,
    Object? removalTimeLeft = _sentinel,
    Object? workTimeLeft = _sentinel,
    bool? isWorking,
    Object? storedWorkerId = _sentinel,
    int? hp,
    bool? visible,
  }) {
    return CardModel(
      id: id ?? this.id,
      type: type ?? this.type,
      position: position ?? this.position,
      removalTimeLeft: removalTimeLeft == _sentinel
          ? this.removalTimeLeft
          : removalTimeLeft as double?,
      workTimeLeft: workTimeLeft == _sentinel
          ? this.workTimeLeft
          : workTimeLeft as double?,
      isWorking: isWorking ?? this.isWorking,
      storedWorkerId: storedWorkerId == _sentinel
          ? this.storedWorkerId
          : storedWorkerId as String?,
      hp: hp ?? this.hp,
      visible: visible ?? this.visible,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'x': position.dx,
      'y': position.dy,
      if (removalTimeLeft != null) 'removalTimeLeft': removalTimeLeft,
      if (workTimeLeft != null) 'workTimeLeft': workTimeLeft,
      'isWorking': isWorking,
      if (storedWorkerId != null) 'storedWorkerId': storedWorkerId,
      'hp': hp,
      'visible': visible,
    };
  }

  factory CardModel.fromJson(Map<String, dynamic> json) {
    return CardModel(
      id: json['id'] as String,
      type: CardType.values.firstWhere((e) => e.name == json['type']),
      position: Offset(
        (json['x'] as num).toDouble(),
        (json['y'] as num).toDouble(),
      ),
      removalTimeLeft: (json['removalTimeLeft'] as num?)?.toDouble(),
      workTimeLeft: (json['workTimeLeft'] as num?)?.toDouble(),
      isWorking: json['isWorking'] as bool? ?? false,
      storedWorkerId: json['storedWorkerId'] as String?,
      hp: json['hp'] as int? ?? 10,
      visible: json['visible'] as bool? ?? true,
    );
  }

  @override
  String toString() => 'CardModel(id: $id, type: $type, pos: $position)';
}

// Sentinel object used to distinguish null from "not provided" in copyWith.
const Object _sentinel = Object();
