/// Чистые функции для юнит-тестов (дублируют логику backend calculators).
class CalculatorLogic {
  static Map<String, dynamic> doseByWeight({
    required double mgPerKg,
    required double weightKg,
    required double concentrationMgPerMl,
  }) {
    final totalMg = mgPerKg * weightKg;
    final volumeMl = totalMg / concentrationMgPerMl;
    return {
      'totalMg': (totalMg * 10000).round() / 10000,
      'volumeMl': (volumeMl * 1000).round() / 1000,
    };
  }

  static Map<String, dynamic> infusionRate({
    required double dropsPerMinute,
    required double dropsPerMl,
  }) {
    final mlPerHour = (dropsPerMinute * 60) / dropsPerMl;
    return {'mlPerHour': (mlPerHour * 1000).round() / 1000};
  }
}
