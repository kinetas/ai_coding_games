import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/game_state.dart';

const _kSaveKey = 'cardforge_save';
const _kBestKey = 'cardforge_best';

/// Handles saving and loading [GameState] to/from shared_preferences.
class SaveManager {
  const SaveManager();

  // ── Save ────────────────────────────────────────────────────────────────────

  Future<void> save(GameState state) async {
    final prefs = await SharedPreferences.getInstance();
    final stateJson = state.toJson();
    final body = json.encode(stateJson);
    final checksum = _checksum(body);

    final wrapper = {
      'last_saved': DateTime.now().toIso8601String(),
      'stats': {
        'gameTime': state.gameTime,
        'gameSpeed': state.gameSpeed,
      },
      'active_cards': stateJson['cards'],
      'best_records': {'survival_time': await bestRecord()},
      'checksum': checksum,
      '_body': body,
    };

    await prefs.setString(_kSaveKey, json.encode(wrapper));
  }

  // ── Load ────────────────────────────────────────────────────────────────────

  Future<GameState?> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kSaveKey);
      if (raw == null) return null;

      final wrapper = json.decode(raw) as Map<String, dynamic>;
      final body = wrapper['_body'] as String?;
      final savedChecksum = wrapper['checksum'] as String?;

      if (body == null || savedChecksum == null) return null;

      // Integrity check
      if (_checksum(body) != savedChecksum) return null;

      final stateJson = json.decode(body) as Map<String, dynamic>;
      return GameState.fromJson(stateJson);
    } catch (_) {
      return null;
    }
  }

  // ── Best record ─────────────────────────────────────────────────────────────

  Future<double> bestRecord() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getDouble(_kBestKey) ?? 0.0;
  }

  Future<void> saveBestRecord(double survivalTime) async {
    final prefs = await SharedPreferences.getInstance();
    final current = prefs.getDouble(_kBestKey) ?? 0.0;
    if (survivalTime > current) {
      await prefs.setDouble(_kBestKey, survivalTime);
    }
  }

  Future<void> clearSave() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kSaveKey);
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  static String _checksum(String data) {
    var hash = 5381;
    for (final ch in data.codeUnits) {
      hash = ((hash << 5) + hash) + ch;
      hash &= 0xFFFFFFFF;
    }
    return hash.toRadixString(16).padLeft(8, '0').substring(0, 8);
  }
}

const saveManager = SaveManager();
