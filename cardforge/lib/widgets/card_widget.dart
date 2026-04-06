import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/card_model.dart';
import '../models/card_type.dart';
import '../models/card_definitions.dart';

/// Returns the Korean display name for a [CardCategory].
String _categoryLabel(CardCategory category) {
  switch (category) {
    case CardCategory.human:
      return '인류';
    case CardCategory.building:
      return '건설';
    case CardCategory.nature:
      return '자연';
    case CardCategory.threat:
      return '위협';
    case CardCategory.resource:
      return '재화';
    case CardCategory.weapon:
      return '무기';
  }
}

/// Returns the background color for a [CardCategory].
Color _categoryColor(CardCategory category) {
  switch (category) {
    case CardCategory.human:
      return const Color(0xFF1565C0); // blue
    case CardCategory.building:
      return const Color(0xFFF9A825); // yellow
    case CardCategory.nature:
      return const Color(0xFF2E7D32); // green
    case CardCategory.threat:
      return const Color(0xFFC62828); // red
    case CardCategory.resource:
      return const Color(0xFF546E7A); // grey-blue
    case CardCategory.weapon:
      return const Color(0xFF6A1B9A); // purple
  }
}

/// Returns responsive card dimensions based on screen width.
CardSize cardSizeForWidth(double screenWidth) {
  if (screenWidth < 400) return const CardSize(100, 140);
  if (screenWidth <= 800) return const CardSize(115, 160);
  return const CardSize(130, 180);
}

/// Card dimensions container.
class CardSize {
  final double width;
  final double height;
  const CardSize(this.width, this.height);
}

/// A single card widget that supports drag-and-drop and a drag-target glow.
///
/// Wrap with [Draggable<CardModel>] at the call site to enable dragging.
class CardWidget extends StatelessWidget {
  // Legacy static constants — used where LayoutBuilder is unavailable.
  static const double cardWidth = 130;
  static const double cardHeight = 180;

  final CardModel card;

  /// When true, renders a blue glow border to indicate this card can accept a drop.
  final bool isDragTarget;

  /// Optional override for responsive sizing.
  final CardSize? size;

  const CardWidget({
    super.key,
    required this.card,
    this.isDragTarget = false,
    this.size,
  });

  /// Trigger pick-up haptic feedback on supported platforms.
  static void hapticPickup() =>
      HapticFeedback.selectionClick().catchError((_) {});

  /// Trigger combination-success haptic feedback on supported platforms.
  static void hapticCombine() =>
      HapticFeedback.mediumImpact().catchError((_) {});

  /// Trigger destruction haptic feedback on supported platforms.
  static void hapticDestroy() =>
      HapticFeedback.heavyImpact().catchError((_) {});

  @override
  Widget build(BuildContext context) {
    final def = CARD_DEFS[card.type];
    if (def == null) return const SizedBox.shrink();

    final bgColor = _categoryColor(def.category);
    final isWall = card.type == CardType.wall;

    // Timer fractions (clamped to [0,1])
    final removalMax = def.removalTime;
    final removalFraction = (removalMax != null && removalMax > 0)
        ? ((card.removalTimeLeft ?? removalMax) / removalMax).clamp(0.0, 1.0)
        : null;

    final workMax = def.workTime;
    final workFraction = (workMax != null && workMax > 0 && card.isWorking)
        ? ((card.workTimeLeft ?? workMax) / workMax).clamp(0.0, 1.0)
        : null;

    final decoration = BoxDecoration(
      color: bgColor,
      borderRadius: BorderRadius.circular(12),
      border: isDragTarget
          ? Border.all(color: Colors.lightBlueAccent, width: 2.5)
          : Border.all(color: Colors.white24, width: 1),
      boxShadow: isDragTarget
          ? [
              BoxShadow(
                color: Colors.lightBlueAccent.withOpacity(0.7),
                blurRadius: 16,
                spreadRadius: 4,
              ),
            ]
          : [
              BoxShadow(
                color: Colors.black45,
                blurRadius: 6,
                offset: const Offset(2, 3),
              ),
            ],
    );

    final w = size?.width ?? cardWidth;
    final h = size?.height ?? cardHeight;

    return SizedBox(
      width: w,
      height: h,
      child: DecoratedBox(
        decoration: decoration,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Top badge ────────────────────────────────────────────────
              _CategoryBadge(label: _categoryLabel(def.category), color: bgColor),

              const SizedBox(height: 4),

              // ── Center icon ──────────────────────────────────────────────
              Expanded(
                child: Center(
                  child: Text(
                    def.icon,
                    style: const TextStyle(fontSize: 36),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),

              // ── Card name ────────────────────────────────────────────────
              Text(
                def.name,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),

              const SizedBox(height: 4),

              // ── HP (wall only) ───────────────────────────────────────────
              if (isWall) ...[
                _HpRow(hp: card.hp),
                const SizedBox(height: 3),
              ],

              // ── Work progress bar (only when working) ────────────────────
              if (workFraction != null) ...[
                _TimerBar(
                  fraction: workFraction,
                  color: Colors.orangeAccent,
                  label: '작업',
                ),
                const SizedBox(height: 3),
              ],

              // ── Removal timer bar (only when applicable) ─────────────────
              if (removalFraction != null)
                _TimerBar(
                  fraction: removalFraction,
                  color: Colors.white70,
                  label: null,
                ),

              const SizedBox(height: 2),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Private sub-widgets ────────────────────────────────────────────────────

class _CategoryBadge extends StatelessWidget {
  final String label;
  final Color color;

  const _CategoryBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.black38,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _TimerBar extends StatelessWidget {
  final double fraction; // 0.0 – 1.0
  final Color color;
  final String? label;

  const _TimerBar({required this.fraction, required this.color, this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null)
          Text(
            label!,
            style: const TextStyle(color: Colors.white60, fontSize: 9),
          ),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: LinearProgressIndicator(
            value: fraction,
            minHeight: 5,
            backgroundColor: Colors.black26,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}

class _HpRow extends StatelessWidget {
  final int hp;
  const _HpRow({required this.hp});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Text('❤️', style: TextStyle(fontSize: 11)),
        const SizedBox(width: 3),
        Text(
          '$hp',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 11,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
