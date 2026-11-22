import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sit_pay_mobile/core/theme/theme_mode_provider.dart';
import 'package:sit_pay_mobile/features/auth/models/user_model.dart';
import 'package:sit_pay_mobile/features/auth/providers/auth_provider.dart';
import 'package:sit_pay_mobile/features/profile/screens/profile_screen.dart';

void main() {
  testWidgets('saving a valid alias closes the dialog cleanly', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final auth = _TestAuthProvider();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: auth),
          ChangeNotifierProvider(create: (_) => ThemeModeProvider()),
        ],
        child: const MaterialApp(home: ProfileScreen()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Administrar perfil'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Agregar alias'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Alias1');
    await tester.tap(find.text('Guardar'));
    await tester.pumpAndSettle();

    expect(find.byType(AlertDialog), findsNothing);
    expect(auth.savedAlias, 'Alias1');
  });
}

class _TestAuthProvider extends AuthProvider {
  final UserModel _user = UserModel(
    id: 'test-user',
    email: 'test@example.com',
    rol: 'PASAJERO',
    nombres: 'Test',
    apellidos: 'User',
  );
  String? savedAlias;

  @override
  UserModel? get currentUser => _user;

  @override
  Future<void> updateAlias(String alias) async {
    savedAlias = alias;
  }
}
