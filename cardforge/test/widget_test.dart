import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cardforge/main.dart';

void main() {
  testWidgets('CardForge 앱이 기동한다', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: CardForgeApp()),
    );
    await tester.pump();
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
