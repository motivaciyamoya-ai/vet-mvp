import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/auth_storage.dart';
import 'articles_tab.dart';
import 'calculators_tab.dart';
import 'forum_tab.dart';
import 'home_shell.dart';
import 'listings_tab.dart';
import 'login_screen.dart';
import 'profile_tab.dart';
import 'sos_tab.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key, required this.api});

  final ApiClient api;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final _storage = AuthStorage();
  bool _loading = true;
  bool _authed = false;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    final t = await _storage.access();
    setState(() {
      _authed = t != null && t.isNotEmpty;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!_authed) {
      return LoginScreen(
        api: widget.api,
        storage: _storage,
        onSuccess: () => setState(() => _authed = true),
      );
    }
    final api = widget.api;
    return HomeShell(
      api: api,
      destinations: const [
        NavigationDestination(icon: Icon(Icons.forum_outlined), selectedIcon: Icon(Icons.forum), label: 'Форум'),
        NavigationDestination(icon: Icon(Icons.article_outlined), selectedIcon: Icon(Icons.article), label: 'Статьи'),
        NavigationDestination(icon: Icon(Icons.work_outline), selectedIcon: Icon(Icons.work), label: 'Объявления'),
        NavigationDestination(icon: Icon(Icons.calculate_outlined), selectedIcon: Icon(Icons.calculate), label: 'Калькуляторы'),
        NavigationDestination(icon: Icon(Icons.emergency_outlined), selectedIcon: Icon(Icons.emergency), label: 'SOS'),
        NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Профиль'),
      ],
      pages: [
        ForumTab(api: api),
        ArticlesTab(api: api),
        ListingsTab(api: api),
        CalculatorsTab(api: api),
        SosTab(api: api),
        ProfileTab(api: api, storage: _storage, onLogout: () async {
          await _storage.clear();
          setState(() => _authed = false);
        }),
      ],
    );
  }
}
