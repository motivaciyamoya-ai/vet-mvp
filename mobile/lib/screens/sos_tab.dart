import 'package:flutter/material.dart';

import '../core/api_client.dart';

class SosTab extends StatefulWidget {
  const SosTab({super.key, required this.api});

  final ApiClient api;

  @override
  State<SosTab> createState() => _SosTabState();
}

class _SosTabState extends State<SosTab> {
  List<dynamic> _active = [];
  final _body = TextEditingController();
  final _animal = TextEditingController(text: 'собака');
  final _region = TextEditingController();
  String _urgency = 'MEDIUM';
  String? _err;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _body.dispose();
    _animal.dispose();
    _region.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final d = await widget.api.get('/sos/active') as List<dynamic>;
      setState(() => _active = d);
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  Future<void> _submit() async {
    setState(() => _err = null);
    try {
      await widget.api.post(
        '/sos',
        {
          'body': _body.text,
          'animalKind': _animal.text,
          'urgency': _urgency,
          if (_region.text.isNotEmpty) 'region': _region.text,
        },
        auth: true,
      );
      _body.clear();
      await _load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('SOS отправлен. Коллеги уведомлены (push stub).')));
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Экстренная помощь коллегам. Используйте ответственно.',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          TextField(controller: _body, decoration: const InputDecoration(labelText: 'Суть запроса'), maxLines: 4),
          TextField(controller: _animal, decoration: const InputDecoration(labelText: 'Вид / контекст')),
          TextField(controller: _region, decoration: const InputDecoration(labelText: 'Регион (опционально)')),
          DropdownButtonFormField<String>(
            value: _urgency,
            items: const [
              DropdownMenuItem(value: 'LOW', child: Text('Низкая')),
              DropdownMenuItem(value: 'MEDIUM', child: Text('Средняя')),
              DropdownMenuItem(value: 'HIGH', child: Text('Высокая')),
            ],
            onChanged: (v) => setState(() => _urgency = v ?? 'MEDIUM'),
            decoration: const InputDecoration(labelText: 'Срочность'),
          ),
          if (_err != null) Text(_err!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFB91C1C)),
            onPressed: _submit,
            child: const Text('Отправить SOS'),
          ),
          const Divider(height: 32),
          const Text('Активные запросы', style: TextStyle(fontWeight: FontWeight.bold)),
          ..._active.map(
            (e) {
              final m = e as Map<String, dynamic>;
              return ListTile(
                title: Text(m['body'] as String? ?? ''),
                subtitle: Text('${m['animalKind']} · ${m['urgency']} · ${m['region'] ?? ''}'),
              );
            },
          ),
        ],
      ),
    );
  }
}
