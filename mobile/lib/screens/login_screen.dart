import 'package:flutter/material.dart';

import '../core/api_client.dart' show ApiClient, ApiException;
import '../core/auth_storage.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.api,
    required this.storage,
    required this.onSuccess,
  });

  final ApiClient api;
  final AuthStorage storage;
  final VoidCallback onSuccess;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController(text: 'vet@vetmvp.local');
  final _password = TextEditingController(text: 'Demo123!');
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await widget.api.post('/auth/login', {
        'email': _email.text.trim(),
        'password': _password.text,
      }) as Map<String, dynamic>;
      final access = res['accessToken'] as String;
      final refresh = res['refreshToken'] as String;
      await widget.storage.saveTokens(access: access, refresh: refresh);
      widget.onSuccess();
    } on ApiException catch (e) {
      setState(() => _error = 'Ошибка ${e.status}');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Вход — VetPro CIS')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
            controller: _email,
            decoration: const InputDecoration(labelText: 'Email'),
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            decoration: const InputDecoration(labelText: 'Пароль'),
            obscureText: true,
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _login,
            child: _busy ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Войти'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => RegisterScreen(api: widget.api, storage: widget.storage, onSuccess: widget.onSuccess),
                ),
              );
            },
            child: const Text('Регистрация'),
          ),
          const SizedBox(height: 24),
          const Text(
            'Демо: vet@vetmvp.local / Demo123! (после seed — ADMIN; specialist@ — обычный специалист)',
            style: TextStyle(fontSize: 12),
          ),
        ],
      ),
    );
  }
}
