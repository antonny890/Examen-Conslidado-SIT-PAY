import 'dart:convert';
import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../../features/auth/models/user_model.dart';

class LocalProfileStore {
  static Future<Directory> _getDirectory() async {
    final documents = await getApplicationDocumentsDirectory();
    final directory = Directory('${documents.path}/sitpay_profile');
    if (!await directory.exists()) {
      await directory.create(recursive: true);
    }
    return directory;
  }

  static Future<File> _metadataFile(String userId) async {
    final directory = await _getDirectory();
    return File('${directory.path}/profile_${_safeUserId(userId)}.json');
  }

  static String _safeUserId(String userId) {
    if (!RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(userId)) {
      throw ArgumentError.value(userId, 'userId', 'Invalid user ID.');
    }
    return userId;
  }

  static Future<UserModel> applyTo(UserModel user) async {
    final file = await _metadataFile(user.id);
    if (!await file.exists()) return user;

    final metadata =
        jsonDecode(await file.readAsString()) as Map<String, dynamic>;
    final alias = metadata['alias'] as String?;
    final aliasUpdatedAt = metadata['aliasUpdatedAt'] as String?;
    final profileImagePath = metadata['profileImagePath'] as String?;

    return user.copyWith(
      alias: alias ?? user.alias,
      aliasUpdatedAt: aliasUpdatedAt == null
          ? user.aliasUpdatedAt
          : DateTime.parse(aliasUpdatedAt),
      profileImagePath: profileImagePath ?? user.profileImagePath,
    );
  }

  static Future<void> save(UserModel user) async {
    final file = await _metadataFile(user.id);
    await file.writeAsString(
      jsonEncode({
        'alias': user.alias,
        'aliasUpdatedAt': user.aliasUpdatedAt?.toIso8601String(),
        'profileImagePath': user.profileImagePath,
      }),
      flush: true,
    );
  }

  static Future<String> saveProfileImage({
    required String userId,
    required XFile image,
  }) async {
    final directory = await _getDirectory();
    final safeId = _safeUserId(userId);
    final extension = image.name.contains('.')
        ? image.name.split('.').last.toLowerCase()
        : 'jpg';
    const supportedExtensions = {'jpg', 'jpeg', 'png', 'webp'};
    if (!supportedExtensions.contains(extension)) {
      throw const FormatException('El formato de imagen no es compatible.');
    }

    final temporary = File(
      '${directory.path}/.profile_${safeId}_${DateTime.now().microsecondsSinceEpoch}.tmp',
    );
    try {
      await image.saveTo(temporary.path);

      await for (final entity in directory.list(followLinks: false)) {
        if (entity is File &&
            RegExp('^profile_${RegExp.escape(safeId)}\\.(jpg|jpeg|png|webp)\$')
                .hasMatch(entity.uri.pathSegments.last)) {
          await entity.delete();
        }
      }

      final destination = File('${directory.path}/profile_$safeId.$extension');
      return (await temporary.rename(destination.path)).path;
    } catch (_) {
      if (await temporary.exists()) await temporary.delete();
      rethrow;
    }
  }
}
