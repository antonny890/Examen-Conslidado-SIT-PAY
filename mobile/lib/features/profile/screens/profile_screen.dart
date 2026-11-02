import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/local_profile_store.dart';
import '../../../core/theme/theme_mode_provider.dart';
import '../../../core/utils/alias_rules.dart';
import '../../auth/models/user_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/forgot_password_screen.dart';
import '../../auth/screens/login_screen.dart';

const _profileBlue = Color(0xFF0F3B60);
const _profileAccent = Color(0xFF10B981);

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final displayName = user?.esChofer == true
        ? (user?.alias.isNotEmpty == true ? user!.alias : 'Conductor')
        : (user?.nombreVisible.isNotEmpty == true
            ? user!.nombreVisible
            : 'Usuario SIT-Pay');
    final email = user?.email.isNotEmpty == true ? user!.email : 'Sin correo';
    final avatar = _profileAvatar(user, radius: 29);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Perfil'),
        leading: IconButton(
          tooltip: 'Volver',
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 0, 8, 22),
            child: Column(
              children: [
                avatar,
                const SizedBox(height: 10),
                Text(
                  displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          _ProfileGroup(
            title: 'Cuenta',
            children: [
              _ProfileMenuTile(
                icon: Icons.person_outline_rounded,
                title: 'Administrar perfil',
                subtitle: 'Datos personales, alias y foto',
                onTap: () => _push(context, const _ManageProfileScreen()),
              ),
              _ProfileMenuTile(
                icon: Icons.shield_outlined,
                title: 'Seguridad y privacidad',
                subtitle: 'Contraseña y protección de datos',
                showDivider: false,
                onTap: () => _push(context, const _SecurityPrivacyScreen()),
              ),
            ],
          ),
          _ProfileGroup(
            title: 'Preferencias',
            children: [
              _ProfileMenuTile(
                icon: Icons.notifications_none_rounded,
                title: 'Notificaciones',
                subtitle: 'Elige qué avisos quieres recibir',
                onTap: () => _push(context, const _NotificationsScreen()),
              ),
              _ProfileMenuTile(
                icon: Icons.dark_mode_outlined,
                title: 'Modo oscuro',
                trailing: _ThemeStatus(),
                onTap: () => _push(context, const _AppearanceScreen()),
              ),
              _ProfileMenuTile(
                icon: Icons.language_rounded,
                title: 'Idioma',
                trailing: Text(
                  'Español',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                showDivider: false,
                onTap: () => _push(context, const _LanguageScreen()),
              ),
            ],
          ),
          _ProfileGroup(
            title: 'Soporte',
            children: [
              _ProfileMenuTile(
                icon: Icons.help_outline_rounded,
                title: 'Centro de ayuda',
                onTap: () => _push(
                  context,
                  const _InformationScreen(
                    title: 'Centro de ayuda',
                    icon: Icons.help_outline_rounded,
                    sections: [
                      _InfoSection(
                        title: '¿Cómo funciona SIT-Pay?',
                        body:
                            'SIT-Pay facilita el pago del pasaje urbano. Escanea el QR del vehículo o ingresa su placa y sigue las instrucciones de pago disponibles.',
                      ),
                      _InfoSection(
                        title: '¿Necesitas asistencia?',
                        body:
                            'Si tienes problemas con tu cuenta o un viaje, conserva los datos del vehículo y la fecha para que el equipo de soporte pueda ayudarte.',
                      ),
                      _InfoSection(
                        title: 'Protege tu cuenta',
                        body:
                            'No compartas tu contraseña ni códigos de verificación. SIT-Pay no te solicitará estos datos por llamada o mensaje.',
                      ),
                    ],
                  ),
                ),
              ),
              _ProfileMenuTile(
                icon: Icons.article_outlined,
                title: 'Términos y políticas',
                onTap: () => _push(
                  context,
                  const _InformationScreen(
                    title: 'Términos y políticas',
                    icon: Icons.article_outlined,
                    sections: [
                      _InfoSection(
                        title: 'Uso del aplicativo',
                        body:
                            'SIT-Pay es una aplicación para facilitar pagos de pasajes y consultar la información asociada a tus viajes. La aplicación no almacena dinero en una billetera digital.',
                      ),
                      _InfoSection(
                        title: 'Datos personales',
                        body:
                            'Los datos personales se utilizan para gestionar tu cuenta y prestar las funciones solicitadas, de acuerdo con la Ley N.° 29733 y su normativa aplicable.',
                      ),
                      _InfoSection(
                        title: 'Información de identidad',
                        body:
                            'La consulta de DNI se realiza únicamente con tu autorización y se envía al proveedor configurado para completar tus nombres y apellidos.',
                      ),
                    ],
                  ),
                ),
              ),
              _ProfileMenuTile(
                icon: Icons.info_outline_rounded,
                title: 'Acerca de SIT-Pay',
                showDivider: false,
                onTap: () => _push(
                  context,
                  const _InformationScreen(
                    title: 'Acerca de SIT-Pay',
                    icon: Icons.info_outline_rounded,
                    sections: [
                      _InfoSection(
                        title: 'SIT-Pay Arequipa',
                        body:
                            'Una aplicación de pago de pasajes urbanos que conecta a pasajeros, conductores y empresas de transporte.',
                      ),
                      _InfoSection(
                        title: 'Versión',
                        body: 'SIT-Pay móvil · Versión 1.0.0',
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: () => _confirmLogout(context),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Cerrar sesión'),
            style: OutlinedButton.styleFrom(
              foregroundColor: theme.colorScheme.error,
              side: BorderSide(
                  color: theme.colorScheme.error.withValues(alpha: 0.45)),
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
          if (isDark) const SizedBox(height: 4),
        ],
      ),
      backgroundColor:
          isDark ? const Color(0xFF090D16) : const Color(0xFFF4F5F7),
    );
  }
}

Future<void> _confirmLogout(BuildContext context) async {
  final shouldLogout = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Cerrar sesión'),
      content: const Text('¿Quieres salir de tu cuenta SIT-Pay?'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Cerrar sesión'),
        ),
      ],
    ),
  );
  if (shouldLogout != true || !context.mounted) return;

  await context.read<AuthProvider>().logout();
  if (!context.mounted) return;
  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => const LoginScreen()),
    (route) => false,
  );
}

void _push(BuildContext context, Widget page) {
  Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
}

Widget _profileAvatar(UserModel? user, {double radius = 42}) {
  final imagePath = user?.profileImagePath;
  final localImageExists = imagePath != null && File(imagePath).existsSync();
  final imageUrl = user?.fotoUrl;
  final initial = user?.esChofer == true
      ? (user?.alias.isNotEmpty == true ? user!.alias[0] : 'C')
      : (user?.nombres.isNotEmpty == true ? user!.nombres[0] : 'U');
  ImageProvider<Object>? backgroundImage;
  if (localImageExists) {
    backgroundImage = FileImage(File(imagePath));
  } else if (imageUrl?.isNotEmpty == true) {
    backgroundImage = NetworkImage(imageUrl!);
  }

  return CircleAvatar(
    radius: radius,
    backgroundColor: const Color(0xFFE9C9A6),
    backgroundImage: backgroundImage,
    child: !localImageExists && imageUrl?.isNotEmpty != true
        ? Text(
            initial.toUpperCase(),
            style: TextStyle(
              color: _profileBlue,
              fontSize: radius * 0.8,
              fontWeight: FontWeight.w800,
            ),
          )
        : null,
  );
}

class _ProfileGroup extends StatelessWidget {
  const _ProfileGroup({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 0, 8, 5),
            child: Text(
              title,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Material(
            color: isDark ? const Color(0xFF171717) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            clipBehavior: Clip.antiAlias,
            child: Column(children: children),
          ),
        ],
      ),
    );
  }
}

class _ProfileMenuTile extends StatelessWidget {
  const _ProfileMenuTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.trailing,
    this.showDivider = true,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback onTap;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        ListTile(
          dense: true,
          minVerticalPadding: 4,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 1),
          leading:
              Icon(icon, size: 19, color: theme.colorScheme.onSurfaceVariant),
          title: Text(
            title,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          subtitle: subtitle == null
              ? null
              : Text(
                  subtitle!,
                  style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (trailing != null) trailing!,
              const SizedBox(width: 4),
              Icon(
                Icons.chevron_right_rounded,
                size: 19,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ],
          ),
          onTap: onTap,
        ),
        if (showDivider)
          Padding(
            padding: const EdgeInsets.only(left: 43),
            child: Divider(
              height: 1,
              thickness: 0.6,
              color: theme.colorScheme.outlineVariant.withValues(alpha: 0.45),
            ),
          ),
      ],
    );
  }
}

class _ThemeStatus extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Text(
      isDark ? 'Oscuro' : 'Claro',
      style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
    );
  }
}

class _ProfileSubpage extends StatelessWidget {
  const _ProfileSubpage({
    required this.title,
    required this.icon,
    required this.child,
  });

  final String title;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(
          tooltip: 'Volver al perfil',
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: theme.colorScheme.outlineVariant),
            ),
            child: Row(
              children: [
                Icon(icon, color: theme.colorScheme.primary, size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _ManageProfileScreen extends StatefulWidget {
  const _ManageProfileScreen();

  @override
  State<_ManageProfileScreen> createState() => _ManageProfileScreenState();
}

class _ManageProfileScreenState extends State<_ManageProfileScreen> {
  Future<void> _selectPhoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Elegir de la galería'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Tomar una foto'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;

    try {
      final image = await ImagePicker().pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1024,
        maxHeight: 1024,
      );
      if (image == null || !mounted) return;
      final auth = context.read<AuthProvider>();
      final user = auth.currentUser;
      if (user == null) {
        throw StateError('No hay una sesión activa para actualizar el perfil.');
      }
      final path = await LocalProfileStore.saveProfileImage(
        userId: user.id,
        image: image,
      );
      await auth.updateLocalProfile(profileImagePath: path);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Foto actualizada en este dispositivo.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('No se pudo actualizar la foto: $error'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  Future<void> _editAlias(UserModel user) async {
    final now = DateTime.now();
    if (!AliasRules.canChange(lastChangedAt: user.aliasUpdatedAt, now: now)) {
      final nextChange = AliasRules.nextChangeAt(user.aliasUpdatedAt)!;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Podrás cambiar tu alias el ${DateFormat('dd/MM/yyyy').format(nextChange)}.',
          ),
        ),
      );
      return;
    }

    final controller = TextEditingController(text: user.alias);
    final formKey = GlobalKey<FormState>();
    final alias = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(user.alias.isEmpty ? 'Agregar alias' : 'Cambiar alias'),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: controller,
            autofocus: true,
            maxLength: AliasRules.maxLength,
            validator: AliasRules.validate,
            decoration: const InputDecoration(
              labelText: 'Alias',
              helperText: 'Opcional. Letras y números, sin espacios.',
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.pop(context, controller.text.trim());
              }
            },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (alias == null || alias == user.alias || !mounted) return;
    try {
      await context.read<AuthProvider>().updateLocalProfile(
            alias: alias,
            aliasUpdatedAt: DateTime.now(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Alias guardado en este dispositivo.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo guardar el alias: $error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    if (user == null) {
      return const _ProfileSubpage(
        title: 'Administrar perfil',
        icon: Icons.person_outline_rounded,
        child: Text('No hay una sesión activa.'),
      );
    }
    final nextAliasChange = AliasRules.nextChangeAt(user.aliasUpdatedAt);
    final canChangeAlias = AliasRules.canChange(
      lastChangedAt: user.aliasUpdatedAt,
      now: DateTime.now(),
    );

    return _ProfileSubpage(
      title: 'Administrar perfil',
      icon: Icons.person_outline_rounded,
      child: Column(
        children: [
          Center(
            child: Stack(
              children: [
                _profileAvatar(user, radius: 48),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: IconButton.filled(
                    tooltip: 'Cambiar foto',
                    onPressed: _selectPhoto,
                    icon: const Icon(Icons.camera_alt_outlined, size: 18),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          _ProfileDataCard(
            title: 'Información de cuenta',
            rows: [
              if (!user.esChofer)
                _DataRow(label: 'Nombre completo', value: user.nombreCompleto),
              _DataRow(label: 'Correo electrónico', value: user.email),
              _DataRow(
                  label: 'Tipo de cuenta',
                  value: user.esChofer ? 'Chofer' : 'Usuario'),
              if (user.esChofer && user.choferInfo != null) ...[
                _DataRow(
                    label: 'Placa asignada', value: user.choferInfo!.placa),
                _DataRow(
                    label: 'Empresa', value: user.choferInfo!.empresaNombre),
                _DataRow(
                  label: 'Unidad / cuenca',
                  value:
                      '${user.choferInfo!.unidadCodigo} · ${user.choferInfo!.unidadNombre}',
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          _ProfileDataCard(
            title: 'Alias',
            rows: [
              _DataRow(
                label: 'Alias actual',
                value: user.alias.isEmpty ? 'Sin alias' : user.alias,
              ),
            ],
            footer: Text(
              canChangeAlias
                  ? 'Puedes cambiarlo cada 15 días. Usa letras y números, sin espacios ni símbolos.'
                  : 'Podrás cambiarlo el ${DateFormat('dd/MM/yyyy').format(nextAliasChange!)}.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            action: OutlinedButton.icon(
              onPressed: canChangeAlias ? () => _editAlias(user) : null,
              icon: const Icon(Icons.edit_outlined),
              label:
                  Text(user.alias.isEmpty ? 'Agregar alias' : 'Cambiar alias'),
            ),
          ),
          const SizedBox(height: 12),
          const _PrivacyNotice(),
          const SizedBox(height: 8),
          Text(
            'La foto y el alias se guardan en este dispositivo.',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _SecurityPrivacyScreen extends StatefulWidget {
  const _SecurityPrivacyScreen();

  @override
  State<_SecurityPrivacyScreen> createState() => _SecurityPrivacyScreenState();
}

class _SecurityPrivacyScreenState extends State<_SecurityPrivacyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentPassword = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _apiClient = ApiClient();
  bool _isSubmitting = false;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _currentPassword.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    try {
      final response = await _apiClient.dio.put(
        ApiConstants.changePassword,
        data: {
          'currentPassword': _currentPassword.text,
          'newPassword': _newPassword.text,
        },
      );
      if (!mounted) return;
      _currentPassword.clear();
      _newPassword.clear();
      _confirmPassword.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response.data['message'] ?? 'Contraseña actualizada.'),
        ),
      );
    } on DioException catch (error) {
      if (!mounted) return;
      final responseData = error.response?.data;
      final message = responseData is Map && responseData['message'] is String
          ? responseData['message'] as String
          : 'No se pudo cambiar la contraseña. Comprueba tu conexión e inténtalo nuevamente.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: Colors.red.shade700),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ocurrió un error inesperado: $error'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Widget _passwordField({
    required String label,
    required TextEditingController controller,
    required bool obscure,
    required VoidCallback toggle,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        obscureText: obscure,
        autocorrect: false,
        enableSuggestions: false,
        validator: validator ??
            (value) => value == null || value.isEmpty
                ? 'Este campo es obligatorio.'
                : null,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.lock_outline_rounded),
          suffixIcon: IconButton(
            onPressed: toggle,
            icon: Icon(obscure
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _ProfileSubpage(
      title: 'Seguridad y privacidad',
      icon: Icons.shield_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ProfileDataCard(
            title: 'Cambiar contraseña',
            rows: const [],
            footer: Form(
              key: _formKey,
              child: Column(
                children: [
                  _passwordField(
                    label: 'Contraseña actual',
                    controller: _currentPassword,
                    obscure: _obscureCurrent,
                    toggle: () =>
                        setState(() => _obscureCurrent = !_obscureCurrent),
                  ),
                  _passwordField(
                    label: 'Nueva contraseña',
                    controller: _newPassword,
                    obscure: _obscureNew,
                    toggle: () => setState(() => _obscureNew = !_obscureNew),
                    validator: (value) => value == null || value.length < 8
                        ? 'Usa al menos 8 caracteres.'
                        : null,
                  ),
                  _passwordField(
                    label: 'Confirmar contraseña',
                    controller: _confirmPassword,
                    obscure: _obscureConfirm,
                    toggle: () =>
                        setState(() => _obscureConfirm = !_obscureConfirm),
                    validator: (value) => value != _newPassword.text
                        ? 'Las contraseñas no coinciden.'
                        : null,
                  ),
                  FilledButton(
                    onPressed: _isSubmitting ? null : _changePassword,
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Actualizar contraseña'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          _ProfileDataCard(
            title: 'Recuperar contraseña',
            rows: const [],
            footer: const Text(
              'Si no recuerdas tu contraseña, solicita un código de recuperación por correo.',
            ),
            action: OutlinedButton.icon(
              onPressed: () => _push(context, const ForgotPasswordScreen()),
              icon: const Icon(Icons.mark_email_read_outlined),
              label: const Text('Enviar código al correo'),
            ),
          ),
          const SizedBox(height: 12),
          const _PrivacyNotice(),
        ],
      ),
    );
  }
}

class _NotificationsScreen extends StatefulWidget {
  const _NotificationsScreen();

  @override
  State<_NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<_NotificationsScreen> {
  static const _keys = {
    'payments': 'sit_pay_notifications_payments',
    'travel': 'sit_pay_notifications_travel',
    'security': 'sit_pay_notifications_security',
    'news': 'sit_pay_notifications_news',
  };
  final Map<String, bool> _values = {
    'payments': true,
    'travel': true,
    'security': true,
    'news': false,
  };
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      if (!mounted) return;
      setState(() {
        for (final entry in _keys.entries) {
          _values[entry.key] =
              preferences.getBool(entry.value) ?? _values[entry.key]!;
        }
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('No se pudieron cargar las preferencias: $error')),
      );
    }
  }

  Future<void> _update(String key, bool value) async {
    setState(() => _values[key] = value);
    try {
      final preferences = await SharedPreferences.getInstance();
      await preferences.setBool(_keys[key]!, value);
    } catch (error) {
      if (!mounted) return;
      setState(() => _values[key] = !value);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo guardar la preferencia: $error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return _ProfileSubpage(
      title: 'Notificaciones',
      icon: Icons.notifications_none_rounded,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _ProfileDataCard(
              title: 'Preferencias de aviso',
              rows: const [],
              footer: Column(
                children: [
                  _PreferenceSwitch(
                    title: 'Pagos y comprobantes',
                    subtitle: 'Avisos sobre la actividad de tus pagos.',
                    value: _values['payments']!,
                    onChanged: (value) => _update('payments', value),
                  ),
                  _PreferenceSwitch(
                    title: 'Viajes',
                    subtitle: 'Actualizaciones relacionadas con tus viajes.',
                    value: _values['travel']!,
                    onChanged: (value) => _update('travel', value),
                  ),
                  _PreferenceSwitch(
                    title: 'Seguridad de la cuenta',
                    subtitle: 'Avisos importantes para proteger tu cuenta.',
                    value: _values['security']!,
                    onChanged: (value) => _update('security', value),
                  ),
                  _PreferenceSwitch(
                    title: 'Novedades',
                    subtitle: 'Información y novedades de SIT-Pay.',
                    value: _values['news']!,
                    onChanged: (value) => _update('news', value),
                    showDivider: false,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Estas opciones se guardan en este dispositivo. La entrega de notificaciones depende de que el servicio de avisos esté habilitado.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
    );
  }
}

class _PreferenceSwitch extends StatelessWidget {
  const _PreferenceSwitch({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    this.showDivider = true,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        SwitchListTile.adaptive(
          contentPadding: EdgeInsets.zero,
          title: Text(title, style: const TextStyle(fontSize: 14)),
          subtitle: Text(subtitle, style: theme.textTheme.bodySmall),
          value: value,
          activeTrackColor: _profileAccent,
          onChanged: onChanged,
        ),
        if (showDivider)
          Divider(height: 1, color: theme.colorScheme.outlineVariant),
      ],
    );
  }
}

class _AppearanceScreen extends StatelessWidget {
  const _AppearanceScreen();

  Future<void> _selectMode(BuildContext context, ThemeMode mode) async {
    try {
      await context.read<ThemeModeProvider>().setThemeMode(mode);
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo guardar el tema: $error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ThemeModeProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return _ProfileSubpage(
      title: 'Modo oscuro',
      icon: Icons.dark_mode_outlined,
      child: _ProfileDataCard(
        title: 'Apariencia de la aplicación',
        rows: const [],
        footer: Column(
          children: [
            _PreferenceSwitch(
              title: 'Modo oscuro',
              subtitle: isDark ? 'Activado' : 'Desactivado',
              value: isDark,
              onChanged: (value) => _selectMode(
                context,
                value ? ThemeMode.dark : ThemeMode.light,
              ),
              showDivider: false,
            ),
            const SizedBox(height: 8),
            Text(
              provider.themeMode == ThemeMode.system
                  ? 'El tema sigue automáticamente la apariencia del dispositivo. Usa el interruptor para elegir claro u oscuro.'
                  : 'Tu preferencia se guarda en este dispositivo.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (provider.themeMode != ThemeMode.system) ...[
              const Divider(height: 20),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.settings_suggest_outlined),
                title: const Text('Seguir el tema del dispositivo'),
                subtitle:
                    const Text('Cambiar automáticamente entre claro y oscuro'),
                trailing: IconButton(
                  tooltip: 'Activar tema del dispositivo',
                  onPressed: () => _selectMode(context, ThemeMode.system),
                  icon: const Icon(Icons.check_circle_outline_rounded),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _LanguageScreen extends StatelessWidget {
  const _LanguageScreen();

  @override
  Widget build(BuildContext context) {
    return _ProfileSubpage(
      title: 'Idioma',
      icon: Icons.language_rounded,
      child: _ProfileDataCard(
        title: 'Idioma de la aplicación',
        rows: const [],
        footer: Column(
          children: [
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                Icons.check_circle_rounded,
                color: Theme.of(context).colorScheme.primary,
              ),
              title: const Text('Español'),
              subtitle: const Text('Idioma disponible'),
              trailing: const Text('Actual'),
            ),
            const Divider(height: 1),
            const ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('English'),
              subtitle: Text('Próximamente'),
              trailing: Text('Próximamente'),
              enabled: false,
            ),
            const SizedBox(height: 8),
            Text(
              'La interfaz está disponible actualmente en español.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _InformationScreen extends StatelessWidget {
  const _InformationScreen({
    required this.title,
    required this.icon,
    required this.sections,
  });

  final String title;
  final IconData icon;
  final List<_InfoSection> sections;

  @override
  Widget build(BuildContext context) {
    return _ProfileSubpage(
      title: title,
      icon: icon,
      child: Column(
        children: [
          for (final section in sections) ...[
            _ProfileDataCard(
              title: section.title,
              rows: const [],
              footer: Text(
                section.body,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      height: 1.45,
                    ),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }
}

class _InfoSection {
  const _InfoSection({required this.title, required this.body});

  final String title;
  final String body;
}

class _ProfileDataCard extends StatelessWidget {
  const _ProfileDataCard({
    required this.title,
    required this.rows,
    this.footer,
    this.action,
  });

  final String title;
  final List<_DataRow> rows;
  final Widget? footer;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          if (rows.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (var index = 0; index < rows.length; index++) ...[
              _DataRowTile(row: rows[index]),
              if (index != rows.length - 1)
                Divider(
                  height: 1,
                  color: theme.colorScheme.outlineVariant,
                ),
            ],
          ],
          if (footer != null) ...[
            if (rows.isNotEmpty) const SizedBox(height: 12),
            footer!,
          ],
          if (action != null) ...[
            const SizedBox(height: 12),
            action!,
          ],
        ],
      ),
    );
  }
}

class _DataRow {
  const _DataRow({required this.label, required this.value});

  final String label;
  final String value;
}

class _DataRowTile extends StatelessWidget {
  const _DataRowTile({required this.row});

  final _DataRow row;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              row.label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              row.value.isEmpty ? '—' : row.value,
              textAlign: TextAlign.end,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PrivacyNotice extends StatelessWidget {
  const _PrivacyNotice();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: theme.colorScheme.primary.withValues(alpha: 0.18),
        ),
      ),
      child: const Text(
        'Tus nombres y apellidos registrados no se pueden modificar desde la app. El alias es opcional.',
        style: TextStyle(fontSize: 12, height: 1.4),
      ),
    );
  }
}
