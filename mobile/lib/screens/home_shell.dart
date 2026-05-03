import 'package:flutter/material.dart';

import '../core/api_client.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.api,
    required this.destinations,
    required this.pages,
  });

  final ApiClient api;
  final List<NavigationDestination> destinations;
  final List<Widget> pages;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _titles = ['Форум', 'Статьи', 'Объявления', 'Калькуляторы', 'SOS', 'Профиль'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_index]),
        actions: [
          IconButton(
            tooltip: 'SOS',
            onPressed: () => setState(() => _index = 4),
            icon: const Icon(Icons.emergency, color: Color(0xFFB91C1C)),
          ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: widget.pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: widget.destinations,
      ),
    );
  }
}
