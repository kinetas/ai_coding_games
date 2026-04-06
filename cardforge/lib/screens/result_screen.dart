import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/game_state.dart';
import '../providers/game_provider.dart';
import 'game_screen.dart';

/// Win / lose result screen shown when the game ends.
class ResultScreen extends ConsumerWidget {
  final GameState finalState;

  const ResultScreen({super.key, required this.finalState});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final won = finalState.status == GameStatus.won;
    final secs = finalState.gameTime;
    final timeStr = _fmtTime(secs);

    return Scaffold(
      backgroundColor:
          won ? const Color(0xFF0D2B0D) : const Color(0xFF2B0D0D),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            color: const Color(0xFF1A1A2E),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            elevation: 12,
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // ── Title ───────────────────────────────────────────────
                  Text(
                    won ? '🏰 왕국 건설 완료!' : '💀 왕국 멸망',
                    style: TextStyle(
                      color: won ? Colors.amber : Colors.red[300],
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),

                  // ── Stats ────────────────────────────────────────────────
                  _StatRow(
                    icon: '⏱️',
                    label: won ? '달성 시간' : '생존 시간',
                    value: timeStr,
                  ),
                  if (won) ...[
                    const SizedBox(height: 8),
                    _StatRow(
                        icon: '👥',
                        label: '최종 인구',
                        value: '${finalState.population}명'),
                  ],

                  // ── Defeat reason ────────────────────────────────────────
                  if (!won) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red[900]!.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        '마지막 인구가 사라졌습니다',
                        style: TextStyle(color: Colors.white70, fontSize: 14),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],

                  const SizedBox(height: 32),

                  // ── Buttons ───────────────────────────────────────────────
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            won ? Colors.amber[700] : Colors.red[700],
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.refresh, color: Colors.white),
                      label: const Text(
                        '다시 플레이',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold),
                      ),
                      onPressed: () {
                        ref.read(gameProvider.notifier).startNewGame();
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(
                              builder: (_) => const GameScreen()),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                          builder: (_) => const MainMenuScreen()),
                    ),
                    child: const Text('메인으로',
                        style:
                            TextStyle(color: Colors.white38, fontSize: 14)),
                  ),
                ],
              ),
            ),
          ),
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

// ── Stat row ──────────────────────────────────────────────────────────────────
class _StatRow extends StatelessWidget {
  final String icon;
  final String label;
  final String value;

  const _StatRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('$icon $label',
            style: const TextStyle(color: Colors.white54, fontSize: 14)),
        Text(value,
            style: const TextStyle(
                color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

// ── Main menu screen (referenced from result_screen) ─────────────────────────
class MainMenuScreen extends ConsumerWidget {
  const MainMenuScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A2E),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🏰', style: TextStyle(fontSize: 72)),
              const SizedBox(height: 8),
              const Text(
                'CardForge',
                style: TextStyle(
                  color: Colors.amber,
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                '중세 카드 경영 게임',
                style: TextStyle(color: Colors.white38, fontSize: 14),
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber[700],
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    ref.read(gameProvider.notifier).startNewGame();
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                          builder: (_) => const GameScreen()),
                    );
                  },
                  child: const Text(
                    '게임 시작',
                    style: TextStyle(
                        color: Colors.black87,
                        fontSize: 18,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const _RecipeSummary(),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecipeSummary extends StatelessWidget {
  const _RecipeSummary();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('🏆 승리 조건',
              style: TextStyle(
                  color: Colors.amber,
                  fontSize: 13,
                  fontWeight: FontWeight.bold)),
          SizedBox(height: 6),
          Text('도시 1개 + 성벽 2개 + 인구 10명 이상 동시 달성',
              style: TextStyle(color: Colors.white60, fontSize: 12)),
          SizedBox(height: 10),
          Text('💡 조작 방법',
              style: TextStyle(
                  color: Colors.lightBlue,
                  fontSize: 13,
                  fontWeight: FontWeight.bold)),
          SizedBox(height: 6),
          Text('카드를 드래그해 다른 카드 위에 놓으면 조합',
              style: TextStyle(color: Colors.white60, fontSize: 12)),
          Text('파란 글로우 = 조합 가능 표시',
              style: TextStyle(color: Colors.white60, fontSize: 12)),
        ],
      ),
    );
  }
}
