import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/storage/local_profile_store.dart';
import '../../../core/theme/theme_mode_provider.dart';
import '../../../core/utils/alias_rules.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/login_screen.dart';

/// Perfil local de Pasajeros y Choferes. Alias y foto aún no se envían al backend.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Future<void> _selectProfilePhoto() async {
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
        const SnackBar(
            content: Text('Foto de perfil actualizada en este dispositivo.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error is FormatException
                ? error.message
                : 'No se pudo actualizar la foto: $error',
          ),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  Future<void> _editAlias() async {
    final auth = context.read<AuthProvider>();
    final user = auth.currentUser;
    if (user == null) return;

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
            textCapitalization: TextCapitalization.none,
            validator: AliasRules.validate,
            decoration: const InputDecoration(
              labelText: 'Alias',
              helperText: 'Opcional. Solo letras y números, sin espacios.',
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
              if (!formKey.currentState!.validate()) return;
              Navigator.pop(context, controller.text.trim());
            },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (alias == null || alias == user.alias || !mounted) return;
    try {
      await auth.updateLocalProfile(
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
        SnackBar(
          content: Text('No se pudo guardar el alias: $error'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  Future<void> _setThemeMode(ThemeMode mode) async {
    try {
      await context.read<ThemeModeProvider>().setThemeMode(mode);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('El tema cambió, pero no se pudo guardar: $error'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final themeModeProvider = context.watch<ThemeModeProvider>();
    final user = auth.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final localImagePath = user?.profileImagePath;
    final hasLocalImage =
        localImagePath != null && File(localImagePath).existsSync();
    final remoteImageUrl = user?.fotoUrl ?? '';
    final isDriver = user?.esChofer == true;
    final profileTitle = isDriver
        ? (user?.alias.isNotEmpty == true ? user!.alias : 'Conductor')
        : user?.nombreVisible ?? 'Usuario SIT-Pay';
    final profileInitial = isDriver
        ? (user?.alias.isNotEmpty == true ? user!.alias[0].toUpperCase() : 'C')
        : user?.nombres.isNotEmpty == true
            ? user!.nombres[0].toUpperCase()
            : 'U';
    ImageProvider<Object>? avatarImage;
    if (hasLocalImage) {
      avatarImage = FileImage(File(localImagePath));
    } else if (remoteImageUrl.isNotEmpty) {
      avatarImage = NetworkImage(remoteImageUrl);
    }
    final canChangeAlias = AliasRules.canChange(
      lastChangedAt: user?.aliasUpdatedAt,
      now: DateTime.now(),
    );
    final nextAliasChange = AliasRules.nextChangeAt(user?.aliasUpdatedAt);

    return Scaffold(
      appBar: AppBar(title: const Text('Mi Perfil')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Column(
                children: [
                  Stack(
                    children: [
                      CircleAvatar(
                        radius: 48,
                        backgroundColor: const Color(0xFF0F3B60),
                        backgroundImage: avatarImage,
                        child: avatarImage != null
                            ? null
                            : Text(
                                profileInitial,
                                style: const TextStyle(
                                  fontSize: 36,
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: IconButton.filled(
                          tooltip: 'Cambiar foto de perfil',
                          onPressed: _selectProfilePhoto,
                          icon: const Icon(Icons.camera_alt_outlined, size: 18),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    profileTitle,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (!isDriver && user?.alias.isNotEmpty == true) ...[
                    const SizedBox(height: 4),
                    Text(
                      user!.nombreCompleto,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: user?.esChofer == true
                          ? Colors.amber.withValues(alpha: 0.15)
                          : const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      user?.esChofer == true ? 'CHOFER' : 'USUARIO',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: user?.esChofer == true
                            ? Colors.amber.shade800
                            : const Color(0xFF10B981),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'La foto se guarda solo en este dispositivo.',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF131B2E) : Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
              ),
              child: Column(
                children: [
                  if (!isDriver) ...[
                    _buildProfileRow(
                      'Nombre legal',
                      user?.nombreCompleto ?? '-',
                    ),
                    const Divider(height: 20),
                  ],
                  _buildProfileRow('Correo electrónico', user?.email ?? '-'),
                  const Divider(height: 20),
                  _buildProfileRow(
                      'Tipo de rol en SIT', user?.rol ?? 'USUARIO'),
                  if (user?.esChofer == true) ...[
                    if (user?.choferInfo?.placa.isNotEmpty == true) ...[
                      const Divider(height: 20),
                      _buildProfileRow(
                        'Placa asignada',
                        user!.choferInfo!.placa,
                      ),
                    ],
                    if (user?.choferInfo?.empresaNombre.isNotEmpty == true) ...[
                      const Divider(height: 20),
                      _buildProfileRow(
                        'Empresa',
                        user!.choferInfo!.empresaNombre,
                      ),
                    ],
                    if (user?.choferInfo?.unidadCodigo.isNotEmpty == true) ...[
                      const Divider(height: 20),
                      _buildProfileRow(
                        'Unidad / cuenca',
                        '${user!.choferInfo!.unidadCodigo} · ${user.choferInfo!.unidadNombre}',
                      ),
                    ],
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF131B2E) : Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Alias',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.alias.isNotEmpty == true ? user!.alias : 'Sin alias',
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    canChangeAlias
                        ? 'Puedes agregar o cambiar tu alias. Solo letras y números, sin espacios ni símbolos.'
                        : 'Podrás cambiarlo el ${DateFormat('dd/MM/yyyy').format(nextAliasChange!)}.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: canChangeAlias ? _editAlias : null,
                    icon: const Icon(Icons.edit_outlined),
                    label: Text(
                      user?.alias.isNotEmpty == true
                          ? 'Cambiar alias'
                          : 'Agregar alias',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: Theme.of(context).colorScheme.outlineVariant,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Text(
                    'Apariencia',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    themeModeProvider.themeMode == ThemeMode.system
                        ? 'Automático según el tema de tu dispositivo.'
                        : 'Tema elegido manualmente.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 12),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isDarkSelected = themeModeProvider.themeMode ==
                              ThemeMode.dark ||
                          (themeModeProvider.themeMode == ThemeMode.system &&
                              isDark);
                      final scheme = Theme.of(context).colorScheme;
                      return Container(
                        height: 52,
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF0B1220)
                              : const Color(0xFFE9EFF6),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Theme.of(context).colorScheme.outlineVariant,
                          ),
                        ),
                        child: Stack(
                          children: [
                            AnimatedAlign(
                              alignment: isDarkSelected
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                              duration: const Duration(milliseconds: 280),
                              curve: Curves.easeInOutCubic,
                              child: SizedBox(
                                width: constraints.maxWidth / 2,
                                height: 44,
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    color: isDark
                                        ? const Color(0xFF38BDF8)
                                        : scheme.primary,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: (isDark
                                                ? const Color(0xFF38BDF8)
                                                : scheme.primary)
                                            .withValues(alpha: 0.22),
                                        blurRadius: 8,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            Row(
                              children: [
                                Expanded(
                                  child: _AppearanceOption(
                                    icon: Icons.light_mode_rounded,
                                    label: 'Claro',
                                    selected: !isDarkSelected,
                                    onTap: () => _setThemeMode(ThemeMode.light),
                                  ),
                                ),
                                Expanded(
                                  child: _AppearanceOption(
                                    icon: Icons.dark_mode_rounded,
                                    label: 'Oscuro',
                                    selected: isDarkSelected,
                                    onTap: () => _setThemeMode(ThemeMode.dark),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF10253A)
                    : Colors.blue.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark
                      ? const Color(0xFF1E4970)
                      : Colors.blue.withValues(alpha: 0.2),
                ),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.shield_outlined,
                        size: 20,
                        color: Color(0xFF38BDF8),
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Protección de Datos (Ley N° 29733)',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: Color(0xFF38BDF8),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Los nombres y apellidos de registro no se pueden modificar desde la app. El alias es opcional y la foto de perfil permanece en este dispositivo.',
                    style: TextStyle(fontSize: 12, color: Color(0xFFCBD5E1)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red),
                minimumSize: const Size.fromHeight(52),
              ),
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Cerrar Sesión'),
              onPressed: () async {
                await auth.logout();
                if (!context.mounted) return;
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileRow(String title, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Flexible(
          child: Text(
            title,
            style: const TextStyle(color: Colors.grey, fontSize: 13),
          ),
        ),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
        ),
      ],
    );
  }
}

class _AppearanceOption extends StatelessWidget {
  const _AppearanceOption({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selectedColor = isDark ? Colors.black : Colors.white;
    final unselectedColor = Theme.of(context).colorScheme.onSurfaceVariant;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: selected ? selectedColor : unselectedColor,
            ),
            const SizedBox(width: 7),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOut,
              style: TextStyle(
                color: selected ? selectedColor : unselectedColor,
                fontSize: 14,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              ),
              child: Text(label),
            ),
          ],
        ),
      ),
    );
  }
}
