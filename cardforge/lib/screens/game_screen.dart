import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../logic/save_manager.dart';
import '../models/game_state.dart';
import '../providers/game_provider.dart';
import '../widgets/event_log.dart';
import '../widgets/game_board.dart';
import '../widgets/help_panel.dart';
import '../widgets/top_bar.dart';
import 'result_screen.dart';

class GameScreen extends ConsumerStatefulWidget {
  /// If true, attempt to resume a saved game instead of starting fresh.
  final bool tryResume;

  const GameScreen({super.key, this.tryResume = false});

  @override
  ConsumerState<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends ConsumerState<GameScreen>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _startGame());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // ── AppLifecycle: auto-save on pause ─────────────────────────────────────

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      final gameState = ref.read(gameProvider);
      if (gameState.status == GameStatus.playing) {
        saveManager.save(gameState);
      }
    }
  }

  // ── Initialise game ──────────────────────────────────────────────────────

  Future<void> _startGame() async {
    if (widget.tryResume) {
      final saved = await saveManager.load();
      if (saved != null && saved.status == GameStatus.playing) {
        ref.read(gameProvider.notifier).loadGame(saved);
        return;
      }
    }
    ref.read(gameProvider.notifier).startNewGame();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<GameState>(gameProvider, (prev, next) {
      if (prev?.status == GameStatus.playing &&
          next.status != GameStatus.playing) {
        // Save best survival record on game end
        saveManager.saveBestRecord(next.gameTime);
        saveManager.clearSave();

        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => ResultScreen(finalState: next)),
        );
      }
    });

    return Scaffold(
      backgroundColor: const Color(0xFF1A1A2E),
      body: Stack(
        children: [
          // ── Game board (fills entire screen) ──────────────────────────────
          const Positioned.fill(child: GameBoard()),

          // ── Top bar ────────────────────────────────────────────────────────
          const Positioned(top: 0, left: 0, right: 0, child: TopBar()),

          // ── Event log (bottom-right floating) ─────────────────────────────
          const Positioned(right: 0, bottom: 0, child: EventLog()),

          // ── Help panel (bottom-left floating) ─────────────────────────────
          const Positioned(left: 0, bottom: 0, child: HelpPanel()),
        ],
      ),
    );
  }
}
