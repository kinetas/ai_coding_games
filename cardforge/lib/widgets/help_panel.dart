import 'package:flutter/material.dart';

/// Collapsible help panel shown at the bottom-left of the board.
class HelpPanel extends StatefulWidget {
  const HelpPanel({super.key});

  @override
  State<HelpPanel> createState() => _HelpPanelState();
}

class _HelpPanelState extends State<HelpPanel> {
  bool _expanded = false;

  static const _recipes = [
    '돌+돌 → 벽돌',
    '벽돌+벽돌 → 성벽',
    '목재+돌 → 창',
    '목재+목재 → 배',
    '식량+식량 → 씨앗',
    '씨앗+농지 → 과수원',
    '창+창 → 활',
    '활+전사 → 궁수',
    '벽돌+나무 → 목조 가옥',
    '가옥+가옥 → 마을',
    '마을+마을 → 도시',
    '창+사람 → 전사',
  ];

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.bottomLeft,
      child: Container(
        margin: const EdgeInsets.all(10),
        constraints: const BoxConstraints(maxWidth: 220),
        decoration: BoxDecoration(
          color: const Color(0xDD0F1B2E),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Toggle header ──────────────────────────────────────────────
            GestureDetector(
              onTap: () => setState(() => _expanded = !_expanded),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                child: Row(
                  children: [
                    const Text('📖',
                        style: TextStyle(fontSize: 14, color: Colors.white70)),
                    const SizedBox(width: 6),
                    const Expanded(
                      child: Text(
                        '조합 레시피',
                        style: TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                    Icon(
                      _expanded ? Icons.expand_more : Icons.chevron_right,
                      color: Colors.white38,
                      size: 16,
                    ),
                  ],
                ),
              ),
            ),

            // ── Recipe list ────────────────────────────────────────────────
            if (_expanded)
              Padding(
                padding:
                    const EdgeInsets.only(left: 10, right: 10, bottom: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Divider(color: Colors.white12, height: 1),
                    const SizedBox(height: 6),
                    for (final r in _recipes)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 3),
                        child: Text(
                          r,
                          style: const TextStyle(
                              color: Colors.white60, fontSize: 11),
                        ),
                      ),
                    const SizedBox(height: 4),
                    const Divider(color: Colors.white12, height: 1),
                    const SizedBox(height: 4),
                    const Text(
                      '🏆 승리: 도시1 + 성벽2 + 인구10',
                      style: TextStyle(color: Colors.amber, fontSize: 11),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
