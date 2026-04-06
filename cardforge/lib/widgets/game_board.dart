import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../logic/interaction.dart';
import '../models/card_model.dart';
import '../models/game_state.dart';
import '../providers/game_provider.dart';
import 'card_widget.dart' show CardWidget, CardSize, cardSizeForWidth;

/// Free-placement game board with drag-and-drop card interactions.
///
/// Layout contract:
///   - Each card's [CardModel.position] is a fractional offset (0.0–1.0)
///     relative to the board's width/height.
///   - Cards are rendered as [Positioned] children of a [Stack].
///   - Dragging a card to an empty area updates its stored position.
///   - Dropping on a valid target calls [executeInteraction].
class GameBoard extends ConsumerStatefulWidget {
  const GameBoard({super.key});

  @override
  ConsumerState<GameBoard> createState() => _GameBoardState();
}

class _GameBoardState extends ConsumerState<GameBoard> {
  /// Key used to obtain the board's [RenderBox] for global→local conversion.
  final _boardKey = GlobalKey();

  /// Card IDs in draw order: last entry is rendered on top (highest z-index).
  final List<String> _zOrder = [];

  /// ID of the card currently highlighted as a valid drop target.
  String? _activeTargetId;

  // ── Z-order helpers ────────────────────────────────────────────────────────

  void _bringToFront(String cardId) {
    setState(() {
      _zOrder.remove(cardId);
      _zOrder.add(cardId);
    });
  }

  /// Keeps [_zOrder] consistent with the current visible card list.
  void _syncZOrder(List<CardModel> visible) {
    // Append cards that are new (spawned after last sync)
    for (final c in visible) {
      if (!_zOrder.contains(c.id)) _zOrder.add(c.id);
    }
    // Remove cards that are no longer visible
    _zOrder.removeWhere((id) => !visible.any((c) => c.id == id));
  }

  // ── Coordinate helpers ─────────────────────────────────────────────────────

  /// Converts a global [offset] (e.g. from [DraggableDetails.offset]) to a
  /// fractional board position, clamped so the card stays fully inside bounds.
  Offset _toRatioPosition(Offset globalOffset, Size boardSize, [CardSize? cs]) {
    final boardBox = _boardKey.currentContext?.findRenderObject() as RenderBox?;
    if (boardBox == null) return Offset.zero;

    final local = boardBox.globalToLocal(globalOffset);
    final maxX = boardSize.width - (cs?.width ?? CardWidget.cardWidth);
    final maxY = boardSize.height - (cs?.height ?? CardWidget.cardHeight);

    // Clamp in pixel space first, then normalise to [0, 1]
    final px = local.dx.clamp(0.0, maxX.clamp(0.0, double.infinity));
    final py = local.dy.clamp(0.0, maxY.clamp(0.0, double.infinity));

    return Offset(
      boardSize.width > 0 ? px / boardSize.width : 0.0,
      boardSize.height > 0 ? py / boardSize.height : 0.0,
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final gameState = ref.watch(gameProvider);
    final visible = gameState.cards.where((c) => c.visible).toList();
    _syncZOrder(visible);

    // Render cards in z-order (last = top)
    final ordered = _zOrder
        .where((id) => visible.any((c) => c.id == id))
        .map((id) => visible.firstWhere((c) => c.id == id))
        .toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        final boardSize = Size(constraints.maxWidth, constraints.maxHeight);
        final cs = cardSizeForWidth(constraints.maxWidth);

        return Container(
          key: _boardKey,
          color: Colors.transparent,
          child: Stack(
            clipBehavior: Clip.hardEdge,
            children: [
              // Fill the board so empty-area taps are captured
              Positioned.fill(
                child: GestureDetector(behavior: HitTestBehavior.translucent),
              ),

              for (final card in ordered)
                _buildCard(card, boardSize, gameState, cs),
            ],
          ),
        );
      },
    );
  }

  // ── Per-card widget ────────────────────────────────────────────────────────

  Widget _buildCard(CardModel card, Size boardSize, GameState gameState, CardSize cs) {
    final isTarget = _activeTargetId == card.id;

    // Pixel position (top-left of the card widget)
    final maxX = (boardSize.width - cs.width).clamp(0.0, double.infinity);
    final maxY = (boardSize.height - cs.height).clamp(0.0, double.infinity);
    final px = (card.position.dx * boardSize.width).clamp(0.0, maxX);
    final py = (card.position.dy * boardSize.height).clamp(0.0, maxY);

    return Positioned(
      left: px,
      top: py,
      child: DragTarget<CardModel>(
        onWillAcceptWithDetails: (details) {
          final dragger = details.data;
          if (!canInteract(dragger, card)) return false;
          setState(() => _activeTargetId = card.id);
          return true;
        },
        onLeave: (_) {
          if (_activeTargetId == card.id) {
            setState(() => _activeTargetId = null);
          }
        },
        onAcceptWithDetails: (details) {
          setState(() => _activeTargetId = null);
          final current = ref.read(gameProvider);
          final newState = executeInteraction(details.data, card, current);
          if (newState != current) CardWidget.hapticCombine();
          ref.read(gameProvider.notifier).applyExternalUpdate(newState);
        },
        builder: (context, candidateData, _) {
          final glowing = candidateData.isNotEmpty || isTarget;
          return Draggable<CardModel>(
            data: card,
            // Semi-transparent card follows the pointer
            feedback: Material(
                      color: Colors.transparent,
                      child: Opacity(
                        opacity: 0.8,
                        child: CardWidget(card: card, size: cs),
                      ),
                    ),
                    // Invisible placeholder keeps the layout stable while dragging
                    childWhenDragging: SizedBox(
                      width: cs.width,
                      height: cs.height,
                    ),
                    onDragStarted: () {
                      _bringToFront(card.id);
                      CardWidget.hapticPickup();
                    },
                    onDragEnd: (details) {
                      // Only update position if the drop was NOT accepted by a target
                      if (!details.wasAccepted) {
                        final newRatio = _toRatioPosition(details.offset, boardSize, cs);
                final current = ref.read(gameProvider);
                final updatedCards = current.cards.map((c) {
                  return c.id == card.id ? c.copyWith(position: newRatio) : c;
                }).toList();
                ref.read(gameProvider.notifier).applyExternalUpdate(
                      current.copyWith(cards: updatedCards),
                    );
              }
            },
                    child: CardWidget(card: card, isDragTarget: glowing, size: cs),
          );
        },
      ),
    );
  }
}
