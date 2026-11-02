import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeModeProvider extends ChangeNotifier {
  static const _preferenceKey = 'sit_pay_theme_mode';

  ThemeMode _themeMode = ThemeMode.system;
  bool _hasUserSelection = false;
  ThemeMode get themeMode => _themeMode;

  ThemeModeProvider() {
    _loadThemeMode();
  }

  Future<void> _loadThemeMode() async {
    final preferences = await SharedPreferences.getInstance();
    final storedMode = preferences.getString(_preferenceKey);
    if (_hasUserSelection) return;
    _themeMode = switch (storedMode) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    final storedMode = switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };

    _hasUserSelection = true;
    if (_themeMode != mode) {
      _themeMode = mode;
      notifyListeners();
    }

    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_preferenceKey, storedMode);
  }
}
