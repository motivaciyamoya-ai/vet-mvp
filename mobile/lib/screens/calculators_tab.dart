import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../domain/calculator_logic.dart';

class CalculatorsTab extends StatefulWidget {
  const CalculatorsTab({super.key, required this.api});

  final ApiClient api;

  @override
  State<CalculatorsTab> createState() => _CalculatorsTabState();
}

class _CalculatorsTabState extends State<CalculatorsTab> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);

  final _mgPerKg = TextEditingController(text: '10');
  final _weight = TextEditingController(text: '25');
  final _conc = TextEditingController(text: '50');

  final _dropsMin = TextEditingController(text: '20');
  final _dropsMl = TextEditingController(text: '20');

  Map<String, dynamic>? _dose;
  Map<String, dynamic>? _inf;

  @override
  void dispose() {
    _tabs.dispose();
    _mgPerKg.dispose();
    _weight.dispose();
    _conc.dispose();
    _dropsMin.dispose();
    _dropsMl.dispose();
    super.dispose();
  }

  Future<void> _calcDose() async {
    setState(() {
      _dose = CalculatorLogic.doseByWeight(
        mgPerKg: double.tryParse(_mgPerKg.text) ?? 0,
        weightKg: double.tryParse(_weight.text) ?? 0,
        concentrationMgPerMl: double.tryParse(_conc.text) ?? 0,
      );
    });
    try {
      await widget.api.post('/calculators/dose-by-weight', {
        'mgPerKg': double.parse(_mgPerKg.text),
        'weightKg': double.parse(_weight.text),
        'concentrationMgPerMl': double.parse(_conc.text),
      });
    } catch (_) {}
  }

  Future<void> _calcInf() async {
    setState(() {
      _inf = CalculatorLogic.infusionRate(
        dropsPerMinute: double.tryParse(_dropsMin.text) ?? 0,
        dropsPerMl: double.tryParse(_dropsMl.text) ?? 0,
      );
    });
    try {
      await widget.api.post('/calculators/infusion-rate', {
        'dropsPerMinute': double.parse(_dropsMin.text),
        'dropsPerMl': double.parse(_dropsMl.text),
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: 'Доза по весу'),
            Tab(text: 'Скорость инфузии'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabs,
            children: [
              ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  TextField(controller: _mgPerKg, decoration: const InputDecoration(labelText: 'мг/кг')),
                  TextField(controller: _weight, decoration: const InputDecoration(labelText: 'Масса, кг')),
                  TextField(controller: _conc, decoration: const InputDecoration(labelText: 'мг/мл')),
                  FilledButton(onPressed: _calcDose, child: const Text('Рассчитать')),
                  if (_dose != null) ...[
                    const SizedBox(height: 12),
                    Text('Всего мг: ${_dose!['totalMg']}'),
                    Text('Объём, мл: ${_dose!['volumeMl']}'),
                  ],
                  const SizedBox(height: 16),
                  const Text(
                    'Дисклеймер: расчёт справочный. Не заменяет назначение врача и инструкцию к препарату.',
                    style: TextStyle(fontSize: 12),
                  ),
                ],
              ),
              ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  TextField(controller: _dropsMin, decoration: const InputDecoration(labelText: 'Капель/мин')),
                  TextField(controller: _dropsMl, decoration: const InputDecoration(labelText: 'Капель/мл')),
                  FilledButton(onPressed: _calcInf, child: const Text('Рассчитать')),
                  if (_inf != null) Text('мл/ч: ${_inf!['mlPerHour']}'),
                  const SizedBox(height: 16),
                  const Text(
                    'Дисклеймер: проверьте калибровку системы и раствор.',
                    style: TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
