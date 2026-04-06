import 'card_model.dart';

/// Current play status of the game.
enum GameStatus { playing, won, lost }

/// Top-level game state managed by Riverpod.
class GameState {
  final List<CardModel> cards;

  /// Total elapsed game time in seconds.
  final double gameTime;

  /// Speed multiplier (1.0 = normal, 2.0 = fast).
  final double gameSpeed;

  final GameStatus status;

  /// Recent event log entries (newest first).
  final List<String> eventLog;

  const GameState({
    this.cards = const [],
    this.gameTime = 0.0,
    this.gameSpeed = 1.0,
    this.status = GameStatus.playing,
    this.eventLog = const [],
  });

  GameState copyWith({
    List<CardModel>? cards,
    double? gameTime,
    double? gameSpeed,
    GameStatus? status,
    List<String>? eventLog,
  }) {
    return GameState(
      cards: cards ?? this.cards,
      gameTime: gameTime ?? this.gameTime,
      gameSpeed: gameSpeed ?? this.gameSpeed,
      status: status ?? this.status,
      eventLog: eventLog ?? this.eventLog,
    );
  }

  // ── Population helpers ─────────────────────────────────────────────────

  int get population {
    return cards.where((c) =>
        c.visible &&
        (c.type.name == 'person' ||
            c.type.name == 'warrior' ||
            c.type.name == 'archer')).length;
  }

  // ── Serialisation ──────────────────────────────────────────────────────

  Map<String, dynamic> toJson() {
    return {
      'gameTime': gameTime,
      'gameSpeed': gameSpeed,
      'status': status.name,
      'eventLog': eventLog,
      'cards': cards.map((c) => c.toJson()).toList(),
    };
  }

  factory GameState.fromJson(Map<String, dynamic> json) {
    final cardList = (json['cards'] as List<dynamic>? ?? [])
        .map((e) => CardModel.fromJson(e as Map<String, dynamic>))
        .toList();

    return GameState(
      cards: cardList,
      gameTime: (json['gameTime'] as num?)?.toDouble() ?? 0.0,
      gameSpeed: (json['gameSpeed'] as num?)?.toDouble() ?? 1.0,
      status: GameStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => GameStatus.playing,
      ),
      eventLog: (json['eventLog'] as List<dynamic>? ?? [])
          .map((e) => e as String)
          .toList(),
    );
  }
}
