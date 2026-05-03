import 'package:flutter/material.dart';

import '../core/api_client.dart' show ApiClient, ApiException;
import '../core/auth_storage.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({
    super.key,
    required this.api,
    required this.storage,
    required this.onSuccess,
  });

  final ApiClient api;
  final AuthStorage storage;
  final VoidCallback onSuccess;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  final _city = TextEditingController();
  List<dynamic> _countries = [];
  List<dynamic> _titles = [];
  String? _countryId;
  String? _jobTitleId;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _loadRef();
  }

  Future<void> _loadRef() async {
    try {
      final c = await widget.api.get('/reference/countries') as List<dynamic>;
      final j = await widget.api.get('/reference/job-titles') as List<dynamic>;
      setState(() {
        _countries = c;
        _titles = j;
        _countryId ??= c.isNotEmpty ? c.first['id'] as String : null;
        _jobTitleId ??= j.isNotEmpty ? j.first['id'] as String : null;
      });
    } catch (_) {
      setState(() => _error = 'Не удалось загрузить справочники. Проверьте API.');
    }
  }

  Future<void> _register() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await widget.api.post('/auth/register', {
        'email': _email.text.trim(),
        'password': _password.text,
        'displayName': _name.text.trim(),
        'city': _city.text.trim(),
        'countryId': _countryId,
        'jobTitleId': _jobTitleId,
      }) as Map<String, dynamic>;
      await widget.storage.saveTokens(
        access: res['accessToken'] as String,
        refresh: res['refreshToken'] as String,
      );
      if (mounted) {
        widget.onSuccess();
        Navigator.of(context).pop();
      }
    } on ApiException catch (e) {
      setState(() => _error = e.body);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    _city.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Регистрация')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
          TextField(controller: _password, decoration: const InputDecoration(labelText: 'Пароль (min 8)'), obscureText: true),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Имя / ник')),
          TextField(controller: _city, decoration: const InputDecoration(labelText: 'Город')),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _countryId,
            items: _countries
                .map((e) => DropdownMenuItem(value: e['id'] as String, child: Text(e['nameRu'] as String)))
                .toList(),
            onChanged: (v) => setState(() => _countryId = v),
            decoration: const InputDecoration(labelText: 'Страна'),
          ),
          DropdownButtonFormField<String>(
            value: _jobTitleId,
            items: _titles
                .map((e) => DropdownMenuItem(value: e['id'] as String, child: Text(e['nameRu'] as String)))
                .toList(),
            onChanged: (v) => setState(() => _jobTitleId = v),
            decoration: const InputDecoration(labelText: 'Должность'),
          ),
          if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _register,
            child: const Text('Создать аккаунт'),
          ),
        ],
      ),
    );
  }
}
