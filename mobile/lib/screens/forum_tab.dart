import 'package:flutter/material.dart';

import '../core/api_client.dart';

class ForumTab extends StatefulWidget {
  const ForumTab({super.key, required this.api});

  final ApiClient api;

  @override
  State<ForumTab> createState() => _ForumTabState();
}

class _ForumTabState extends State<ForumTab> {
  List<dynamic> _cats = [];
  String? _err;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final c = await widget.api.get('/forum/categories') as List<dynamic>;
      setState(() => _cats = c);
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_err != null) {
      return Center(child: Text(_err!));
    }
    if (_cats.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    return ListView.builder(
      itemCount: _cats.length,
      itemBuilder: (ctx, i) {
        final c = _cats[i] as Map<String, dynamic>;
        return ListTile(
          title: Text(c['name'] as String),
          subtitle: Text(c['description'] as String? ?? ''),
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => ForumCategoryScreen(api: widget.api, slug: c['slug'] as String, title: c['name'] as String),
              ),
            );
          },
        );
      },
    );
  }
}

class ForumCategoryScreen extends StatefulWidget {
  const ForumCategoryScreen({super.key, required this.api, required this.slug, required this.title});

  final ApiClient api;
  final String slug;
  final String title;

  @override
  State<ForumCategoryScreen> createState() => _ForumCategoryScreenState();
}

class _ForumCategoryScreenState extends State<ForumCategoryScreen> {
  Map<String, dynamic>? _data;
  String? _err;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await widget.api.get('/forum/categories/${widget.slug}/threads') as Map<String, dynamic>;
      setState(() => _data = d);
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: _err != null
          ? Center(child: Text(_err!))
          : _data == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    itemCount: (_data!['items'] as List<dynamic>).length,
                    itemBuilder: (ctx, i) {
                      final t = (_data!['items'] as List<dynamic>)[i] as Map<String, dynamic>;
                      final author = t['author'] as Map<String, dynamic>?;
                      final profile = author?['profile'] as Map<String, dynamic>?;
                      final country = profile?['country'] as Map<String, dynamic>?;
                      final flag = country != null ? '${country['code']}' : '';
                      return ListTile(
                        title: Text(t['title'] as String),
                        subtitle: Text(
                          [
                            if (profile != null) profile['displayName'] ?? '',
                            if (country != null) country['nameRu'] ?? flag,
                          ].where((e) => (e as String).isNotEmpty).join(' · '),
                        ),
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => ThreadScreen(api: widget.api, threadId: t['id'] as String),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
    );
  }
}

class ThreadScreen extends StatefulWidget {
  const ThreadScreen({super.key, required this.api, required this.threadId});

  final ApiClient api;
  final String threadId;

  @override
  State<ThreadScreen> createState() => _ThreadScreenState();
}

class _ThreadScreenState extends State<ThreadScreen> {
  Map<String, dynamic>? _thread;
  final _body = TextEditingController();
  String? _err;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _body.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final d = await widget.api.get('/forum/threads/${widget.threadId}') as Map<String, dynamic>;
      setState(() => _thread = d);
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  Future<void> _reply() async {
    setState(() => _sending = true);
    try {
      await widget.api.post('/forum/threads/${widget.threadId}/posts', {'body': _body.text}, auth: true);
      _body.clear();
      await _load();
    } catch (e) {
      setState(() => _err = e.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = _thread;
    return Scaffold(
      appBar: AppBar(title: Text(t?['title'] as String? ?? 'Тема')),
      body: _err != null && t == null
          ? Center(child: Text(_err!))
          : t == null
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  children: [
                    Expanded(
                      child: ListView(
                        children: [
                          for (final p in (t['posts'] as List<dynamic>))
                            ListTile(
                              title: Text((p as Map)['body'] as String),
                              subtitle: Text(((p)['author'] as Map?)?['email']?.toString() ?? ''),
                            ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(8),
                      child: Row(
                        children: [
                          Expanded(child: TextField(controller: _body, decoration: const InputDecoration(hintText: 'Ответ…'))),
                          IconButton(
                            onPressed: _sending ? null : _reply,
                            icon: const Icon(Icons.send),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }
}
