import 'package:flutter/material.dart';

import '../core/api_client.dart';

class ArticlesTab extends StatefulWidget {
  const ArticlesTab({super.key, required this.api});

  final ApiClient api;

  @override
  State<ArticlesTab> createState() => _ArticlesTabState();
}

class _ArticlesTabState extends State<ArticlesTab> {
  Map<String, dynamic>? _data;
  String? _err;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await widget.api.get('/articles') as Map<String, dynamic>;
      setState(() => _data = d);
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_err != null) return Center(child: Text(_err!));
    if (_data == null) return const Center(child: CircularProgressIndicator());
    final items = _data!['items'] as List<dynamic>;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        itemCount: items.length,
        itemBuilder: (ctx, i) {
          final a = items[i] as Map<String, dynamic>;
          return ListTile(
            title: Text(a['title'] as String),
            subtitle: Text(a['excerpt'] as String? ?? ''),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => ArticleDetailScreen(api: widget.api, id: a['id'] as String)),
              );
            },
          );
        },
      ),
    );
  }
}

class ArticleDetailScreen extends StatefulWidget {
  const ArticleDetailScreen({super.key, required this.api, required this.id});

  final ApiClient api;
  final String id;

  @override
  State<ArticleDetailScreen> createState() => _ArticleDetailScreenState();
}

class _ArticleDetailScreenState extends State<ArticleDetailScreen> {
  Map<String, dynamic>? _a;
  String? _err;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await widget.api.get('/articles/${widget.id}') as Map<String, dynamic>;
      setState(() => _a = d);
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_a?['title'] as String? ?? 'Статья')),
      body: _err != null
          ? Center(child: Text(_err!))
          : _a == null
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: SelectableText(_a!['body'] as String? ?? ''),
                ),
    );
  }
}
