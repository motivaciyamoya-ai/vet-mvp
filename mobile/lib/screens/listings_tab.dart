import 'package:flutter/material.dart';

import '../core/api_client.dart';

class ListingsTab extends StatefulWidget {
  const ListingsTab({super.key, required this.api});

  final ApiClient api;

  @override
  State<ListingsTab> createState() => _ListingsTabState();
}

class _ListingsTabState extends State<ListingsTab> {
  Map<String, dynamic>? _data;
  String? _type;
  String? _err;

  Future<void> _load() async {
    try {
      final q = _type == null ? null : <String, String>{'type': _type!};
      final path = '/listings';
      final d = q == null
          ? await widget.api.get(path) as Map<String, dynamic>
          : await widget.api.get(path, query: q) as Map<String, dynamic>;
      setState(() => _data = d);
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: [
              FilterChip(
                label: const Text('Все'),
                selected: _type == null,
                onSelected: (_) => setState(() {
                  _type = null;
                  _load();
                }),
              ),
              FilterChip(
                label: const Text('Вакансии'),
                selected: _type == 'JOB',
                onSelected: (_) => setState(() {
                  _type = 'JOB';
                  _load();
                }),
              ),
              FilterChip(
                label: const Text('Куплю'),
                selected: _type == 'BUY',
                onSelected: (_) => setState(() {
                  _type = 'BUY';
                  _load();
                }),
              ),
              FilterChip(
                label: const Text('Продам'),
                selected: _type == 'SELL',
                onSelected: (_) => setState(() {
                  _type = 'SELL';
                  _load();
                }),
              ),
            ],
          ),
        ),
        Expanded(
          child: _err != null
              ? Center(child: Text(_err!))
              : _data == null
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        itemCount: (_data!['items'] as List<dynamic>).length,
                        itemBuilder: (ctx, i) {
                          final l = (_data!['items'] as List<dynamic>)[i] as Map<String, dynamic>;
                          return ListTile(
                            title: Text(l['title'] as String),
                            subtitle: Text('${l['type']} · ${l['region']}'),
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => ListingDetailScreen(api: widget.api, id: l['id'] as String),
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }
}

class ListingDetailScreen extends StatefulWidget {
  const ListingDetailScreen({super.key, required this.api, required this.id});

  final ApiClient api;
  final String id;

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  Map<String, dynamic>? _l;
  final _msg = TextEditingController();
  String? _err;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _msg.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final d = await widget.api.get('/listings/${widget.id}') as Map<String, dynamic>;
      setState(() => _l = d);
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  Future<void> _send() async {
    try {
      await widget.api.post('/listings/${widget.id}/messages', {'body': _msg.text}, auth: true);
      _msg.clear();
      await _load();
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = _l;
    return Scaffold(
      appBar: AppBar(title: Text(l?['title'] as String? ?? 'Объявление')),
      body: _err != null && l == null
          ? Center(child: Text(_err!))
          : l == null
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(l['description'] as String? ?? ''),
                    ),
                    const Divider(),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 12),
                      child: Text('Сообщения', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    Expanded(
                      child: ListView(
                        children: [
                          for (final m in (l['messages'] as List<dynamic>))
                            ListTile(
                              dense: true,
                              title: Text((m as Map)['body'] as String),
                              subtitle: Text(((m)['sender'] as Map?)?['email']?.toString() ?? ''),
                            ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(8),
                      child: Row(
                        children: [
                          Expanded(child: TextField(controller: _msg, decoration: const InputDecoration(hintText: 'Сообщение…'))),
                          IconButton(onPressed: _send, icon: const Icon(Icons.send)),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }
}
