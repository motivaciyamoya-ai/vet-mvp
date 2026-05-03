import 'package:flutter_test/flutter_test.dart';
import 'package:vet_mvp_mobile/domain/calculator_logic.dart';

void main() {
  test('doseByWeight: 10 mg/kg, 25 kg, 50 mg/ml → 125 ml', () {
    final r = CalculatorLogic.doseByWeight(
      mgPerKg: 10,
      weightKg: 25,
      concentrationMgPerMl: 50,
    );
    expect(r['totalMg'], 250);
    expect(r['volumeMl'], 5);
  });

  test('infusionRate: 20 gtt/min, 20 gtt/ml → 60 ml/h', () {
    final r = CalculatorLogic.infusionRate(dropsPerMinute: 20, dropsPerMl: 20);
    expect(r['mlPerHour'], 60);
  });
}
