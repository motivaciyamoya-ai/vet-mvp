import 'package:shared_preferences/shared_preferences.dart';

class AuthStorage {
  static const _access = 'access_token';
  static const _refresh = 'refresh_token';

  Future<void> saveTokens({required String access, required String refresh}) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_access, access);
    await p.setString(_refresh, refresh);
  }

  Future<String?> access() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_access);
  }

  Future<String?> refresh() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_refresh);
  }

  Future<void> clear() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_access);
    await p.remove(_refresh);
  }
}
