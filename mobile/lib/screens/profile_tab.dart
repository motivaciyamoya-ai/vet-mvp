import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/auth_storage.dart';

class ProfileTab extends StatefulWidget {
  const ProfileTab({super.key, required this.api, required this.storage, required this.onLogout});

  final ApiClient api;
  final AuthStorage storage;
  final Future<void> Function() onLogout;

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  Map<String, dynamic>? _me;
  String? _err;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await widget.api.get('/users/me', auth: true) as Map<String, dynamic>;
      setState(() => _me = d);
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  Future<void> _registerPushStub() async {
    try {
      await widget.api.post('/push/register', {'token': 'demo-token-${DateTime.now().millisecondsSinceEpoch}', 'platform': 'flutter'}, auth: true);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Push-токен зарегистрирован (демо)')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_err != null) return Center(child: Text(_err!));
    if (_me == null) return const Center(child: CircularProgressIndicator());
    final p = _me!['profile'] as Map<String, dynamic>?;
    final c = p?['country'] as Map<String, dynamic>?;
    final j = p?['jobTitle'] as Map<String, dynamic>?;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ListTile(
          title: Text(p?['displayName'] as String? ?? ''),
          subtitle: Text(_me!['email'] as String? ?? ''),
        ),
        ListTile(leading: const Icon(Icons.flag), title: Text(c?['nameRu'] as String? ?? '—'), subtitle: const Text('Страна')),
        ListTile(leading: const Icon(Icons.work), title: Text(j?['nameRu'] as String? ?? '—'), subtitle: const Text('Должность')),
        ListTile(leading: const Icon(Icons.place), title: Text(p?['city'] as String? ?? '—'), subtitle: const Text('Город')),
        ListTile(
          leading: const Icon(Icons.verified_user),
          title: Text('Верификация: ${p?['verification'] ?? '—'}'),
        ),
        FilledButton.tonal(onPressed: _registerPushStub, child: const Text('Зарегистрировать демо push-токен')),
        const SizedBox(height: 16),
        OutlinedButton(
          onPressed: () async {
            await widget.onLogout();
          },
          child: const Text('Выйти'),
        ),
      ],
    );
  }
}
