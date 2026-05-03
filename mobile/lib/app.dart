import 'package:flutter/material.dart';

import 'core/api_client.dart';
import 'screens/auth_gate.dart';

class VetMvpApp extends StatelessWidget {
  const VetMvpApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VetPro CIS',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F766E)),
        useMaterial3: true,
      ),
      home: AuthGate(api: ApiClient()),
    );
  }
}
