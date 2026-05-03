import 'package:flutter_test/flutter_test.dart';
import 'package:vet_mvp_mobile/app.dart';

void main() {
  testWidgets('VetMvpApp builds', (tester) async {
    await tester.pumpWidget(const VetMvpApp());
    await tester.pumpAndSettle(const Duration(seconds: 2));
    expect(find.text('Вход — VetPro CIS'), findsOneWidget);
  });
}
