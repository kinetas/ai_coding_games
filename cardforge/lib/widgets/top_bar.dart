import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/card_type.dart';
import '../providers/game_provider.dart';

/// Floating top toolbar: speed controls + quick-add card buttons.
class TopBar extends ConsumerWidget {
  const TopBar({super.key});

  static const _speeds = [1, 2, 5, 10];

  static const _quickAdd = [
    CardType.person,
    CardType.food,
    CardType.stone,
    CardType.wood,
    CardType.spear,
    CardType.farmland,
  ];

  static const _quickAddLabel = {
    CardType.person: '👤',
    CardType.food: '🍖',
    CardType.stone: '🪨',
    CardType.wood: '🪵',
    CardType.spear: '🗡️',
    CardType.farmland: '🌾',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gameState = ref.watch(gameProvider);
    final currentSpeed = gameState.gameSpeed.round();

    return Container(
      color: const Color(0xE616213E),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            // ── Title ───────────────────────────────────────────────────────
            const Text(
              '⚔ CardForge',
              style: TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 12),
            const _Divider(),

            // ── Speed buttons ───────────────────────────────────────────────
            for (final s in _speeds) ...[
              const SizedBox(width: 4),
              Tooltip(
                message: '게임 속도 ${s}x',
                child: _SpeedButton(
                  label: '${s}x',
                  selected: currentSpeed == s,
                  onTap: () =>
                      ref.read(gameProvider.notifier).setSpeed(s.toDouble()),
                ),
              ),
            ],
            const SizedBox(width: 8),
            const _Divider(),

            // ── Quick-add card buttons ───────────────────────────────────────
            for (final type in _quickAdd) ...[
              const SizedBox(width: 4),
              Tooltip(
                message: '${_quickAddLabel[type]} 추가',
                child: _AddCardButton(
                  icon: _quickAddLabel[type]!,
                  onTap: () => ref.read(gameProvider.notifier).addCard(type),
                ),
              ),
            ],
            const SizedBox(width: 8),
            const _Divider(),

            // ── Tidy button ─────────────────────────────────────────────────
            const SizedBox(width: 4),
            Tooltip(
              message: '카드 정리 (그리드 정렬)',
              child: _TidyButton(
                onTap: () => ref.read(gameProvider.notifier).tidyBoard(),
              ),
            ),
            const SizedBox(width: 8),
            const _Divider(),

            // ── Card count ──────────────────────────────────────────────────
            const SizedBox(width: 8),
            Text(
              '카드: ${gameState.cards.where((c) => c.visible).length}',
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Sub-widgets ────────────────────────────────────────────────────────────────

class _Divider extends StatelessWidget {
  const _Divider();
  @override
  Widget build(BuildContext context) =>
      const SizedBox(width: 1, height: 20, child: ColoredBox(color: Colors.white24));
}

class _SpeedButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _SpeedButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? Colors.amber[700] : Colors.white12,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.black87 : Colors.white70,
            fontSize: 12,
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

class _AddCardButton extends StatelessWidget {
  final String icon;
  final VoidCallback onTap;

  const _AddCardButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(5),
        decoration: BoxDecoration(
          color: Colors.white12,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: Colors.white24),
        ),
        child: Text(icon, style: const TextStyle(fontSize: 16)),
      ),
    );
  }
}

class _TidyButton extends StatelessWidget {
  final VoidCallback onTap;

  const _TidyButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.teal.withAlpha(80),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: Colors.teal.withAlpha(150)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('⬛', style: TextStyle(fontSize: 12)),
            SizedBox(width: 3),
            Text(
              '정리',
              style: TextStyle(color: Colors.tealAccent, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
