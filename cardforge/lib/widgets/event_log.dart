import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/game_provider.dart';

/// Floating event log panel (bottom-right). Shows newest entries at the top.
class EventLog extends ConsumerWidget {
  const EventLog({super.key});

  static const _threatKeywords = ['위협', '늑대', '곰', '공격', '파괴', '피해'];

  static bool _isThreat(String entry) =>
      _threatKeywords.any((kw) => entry.contains(kw));

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(gameProvider);
    final log = state.eventLog.take(60).toList();

    return Align(
      alignment: Alignment.bottomRight,
      child: Container(
        margin: const EdgeInsets.all(10),
        width: 220,
        constraints: const BoxConstraints(maxHeight: 280),
        decoration: BoxDecoration(
          color: const Color(0xDD0F1B2E),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Header ────────────────────────────────────────────────────
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              child: Row(
                children: [
                  const Text('📋',
                      style: TextStyle(fontSize: 12, color: Colors.white54)),
                  const SizedBox(width: 6),
                  const Text('이벤트 로그',
                      style:
                          TextStyle(color: Colors.white54, fontSize: 11)),
                  const Spacer(),
                  Text(
                    _fmtTime(state.gameTime),
                    style:
                        const TextStyle(color: Colors.white38, fontSize: 10),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: Colors.white12),

            // ── Log entries ───────────────────────────────────────────────
            if (log.isEmpty)
              const Padding(
                padding: EdgeInsets.all(12),
                child: Text(
                  '이벤트 없음',
                  style: TextStyle(color: Colors.white24, fontSize: 11),
                ),
              )
            else
              Flexible(
                child: ListView.builder(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  reverse: false,
                  shrinkWrap: true,
                  itemCount: log.length,
                  itemBuilder: (_, i) {
                    final entry = log[i];
                    final threat = _isThreat(entry);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Text(
                        entry,
                        style: TextStyle(
                          color: threat ? Colors.red[300] : Colors.white70,
                          fontSize: 11,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  static String _fmtTime(double secs) {
    final m = (secs ~/ 60).toString().padLeft(2, '0');
    final s = (secs.toInt() % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }
}
