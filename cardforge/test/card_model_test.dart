import 'dart:ui' show Offset;
import 'package:flutter_test/flutter_test.dart';
import 'package:cardforge/models/card_model.dart';
import 'package:cardforge/models/card_type.dart';
import 'package:cardforge/models/card_definitions.dart';

void main() {
  group('CardModel serialisation', () {
    test('toJson / fromJson round-trips correctly', () {
      final card = CardModel(
        id: 'test-id-1',
        type: CardType.warrior,
        position: const Offset(0.3, 0.7),
        removalTimeLeft: 45.5,
        hp: 8,
      );

      final json = card.toJson();
      final restored = CardModel.fromJson(json);

      expect(restored.id, card.id);
      expect(restored.type, card.type);
      expect(restored.position, card.position);
      expect(restored.removalTimeLeft, card.removalTimeLeft);
      expect(restored.hp, card.hp);
    });
  });

  group('CARD_DEFS completeness', () {
    test('all CardType values have a definition', () {
      for (final type in CardType.values) {
        expect(CARD_DEFS.containsKey(type), isTrue,
            reason: '${type.name} is missing from CARD_DEFS');
      }
    });
  });
}
