const crypto = require('node:crypto');
const { auth, db, storage } = require('../../config/firebase');
const { signInWithPassword } = require('../../services/firebaseAuthService');
const {
  getDocument,
  queryCollection,
  timestampToDate,
} = require('../../services/firestoreData');

const latestFirst = (left, right) =>
  (timestampToDate(right.created_at)?.getTime() || 0) -
  (timestampToDate(left.created_at)?.getTime() || 0);

const getProfile = async (req, res, next) => {
  try {
    const user = await getDocument('usuarios', req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    const profile = await getDocument('perfiles', req.user.id);
    const preferences = user.rol_codigo === 'PASAJERO'
      ? (await queryCollection('solicitudes_preferenciales', 'usuario_id', '==', req.user.id)).sort(latestFirst)
      : [];
    let vehicleInfo = null;
    if (user.rol_codigo === 'CHOFER') {
      const drivers = await queryCollection('choferes', 'usuario_id', '==', req.user.id);
      const driver = drivers[0];
      if (driver) {
        const [vehicle, company] = await Promise.all([
          driver.vehiculo_id ? getDocument('vehiculos', driver.vehiculo_id) : null,
          driver.empresa_id ? getDocument('empresas', driver.empresa_id) : null,
        ]);
        if (vehicle) {
          vehicleInfo = {
            vehiculo_id: vehicle.id,
            placa: vehicle.placa,
            qr_codigo_seguro: vehicle.qr_codigo_seguro,
            numero_licencia: driver.numero_licencia,
            empresa: company?.nombre_comercial || '',
          };
        }
      }
    }
    return res.json({
      success: true,
      data: {
        usuario: {
          id: user.id,
          email: user.email,
          estado: user.estado,
          created_at: user.created_at,
          rol: user.rol_codigo,
          rol_nombre: user.rol_nombre,
        },
        perfil: profile,
        preferencial: preferences[0] || null,
        vehiculo: vehicleInfo,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { nombres, apellidos, telefono, fotoUrl } = req.body || {};
    const updateData = { updated_at: new Date() };
    if (typeof nombres === 'string' && nombres.trim()) updateData.nombres = nombres.trim();
    if (typeof apellidos === 'string' && apellidos.trim()) updateData.apellidos = apellidos.trim();
    if (telefono !== undefined) updateData.telefono = telefono ? String(telefono).trim() : null;
    if (fotoUrl !== undefined) updateData.foto_url = fotoUrl;
    const profileRef = db.collection('perfiles').doc(req.user.id);
    const profileSnapshot = await profileRef.get();
    if (!profileSnapshot.exists) {
      return res.status(404).json({ success: false, message: 'Perfil no encontrado.' });
    }
    await profileRef.update(updateData);
    return res.json({
      success: true,
      message: 'Perfil actualizado exitosamente.',
      data: { id: req.user.id, ...profileSnapshot.data(), ...updateData },
    });
  } catch (error) {
    return next(error);
  }
};

const updateProfilePhoto = async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = req.body || {};
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (typeof imageBase64 !== 'string' || !allowedTypes.has(mimeType)) {
      return res.status(400).json({ success: false, message: 'Envía una imagen JPG, PNG o WebP válida.' });
    }
    const image = Buffer.from(imageBase64, 'base64');
    if (!image.length || image.length > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'La imagen debe tener un tamaño máximo de 5 MB.' });
    }
    if (!process.env.FIREBASE_STORAGE_BUCKET) {
      return res.status(503).json({ success: false, message: 'Firebase Storage no está configurado en el servidor.' });
    }
    const signatures = {
      'image/jpeg': image.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
      'image/png': image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      'image/webp': image.subarray(0, 4).toString() === 'RIFF' &&
        image.subarray(8, 12).toString() === 'WEBP',
    };
    if (!signatures[mimeType]) {
      return res.status(400).json({ success: false, message: 'El contenido del archivo no coincide con su formato.' });
    }

    const profileRef = db.collection('perfiles').doc(req.user.id);
    const profileSnapshot = await profileRef.get();
    if (!profileSnapshot.exists) {
      return res.status(404).json({ success: false, message: 'Perfil no encontrado.' });
    }
    const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET);
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
    const storagePath = `profile-photos/${req.user.id}/${crypto.randomUUID()}.${extension}`;
    const downloadToken = crypto.randomUUID();
    await bucket.file(storagePath).save(image, {
      resumable: false,
      metadata: {
        contentType: mimeType,
        cacheControl: 'private, max-age=3600',
        metadata: { firebaseStorageDownloadTokens: downloadToken, userId: req.user.id },
      },
      validation: 'crc32c',
    });
    const photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
    await profileRef.update({
      foto_url: photoUrl,
      foto_storage_path: storagePath,
      updated_at: new Date(),
    });
    const oldPath = profileSnapshot.data().foto_storage_path;
    if (oldPath && oldPath !== storagePath) {
      await bucket.file(oldPath).delete({ ignoreNotFound: true });
    }
    return res.json({ success: true, message: 'Foto guardada en Firebase Storage.', data: { fotoUrl: photoUrl } });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' ||
        !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Ingrese la contraseña actual y la nueva.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }
    try {
      await signInWithPassword(req.user.email, currentPassword);
    } catch (error) {
      if (['INVALID_PASSWORD', 'INVALID_LOGIN_CREDENTIALS'].includes(error.firebaseCode)) {
        return res.status(400).json({ success: false, message: 'La contraseña actual no es la correcta.' });
      }
      throw error;
    }
    await auth.updateUser(req.user.id, { password: newPassword });
    await db.collection('usuarios').doc(req.user.id).update({ updated_at: new Date() });
    return res.json({ success: true, message: 'Contraseña cambiada exitosamente.' });
  } catch (error) {
    return next(error);
  }
};

const registerConsent = async (req, res, next) => {
  try {
    const profileRef = db.collection('perfiles').doc(req.user.id);
    const profile = await profileRef.get();
    if (!profile.exists) return res.status(404).json({ success: false, message: 'Perfil no encontrado.' });
    await profileRef.update({
      consentimiento_datos: Boolean(req.body?.consentimiento),
      fecha_consentimiento: new Date(),
      updated_at: new Date(),
    });
    return res.json({
      success: true,
      message: 'Consentimiento de tratamiento de datos actualizado según Ley 29733.',
    });
  } catch (error) {
    return next(error);
  }
};

const deactivateAccount = async (req, res, next) => {
  try {
    await auth.updateUser(req.user.id, { disabled: true });
    await auth.revokeRefreshTokens(req.user.id);
    await db.collection('usuarios').doc(req.user.id).update({
      estado: 'INACTIVO',
      deleted_at: new Date(),
      updated_at: new Date(),
    });
    return res.json({
      success: true,
      message: 'Cuenta desactivada conforme a los derechos ARCO (Ley 29733).',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePhoto,
  changePassword,
  registerConsent,
  deactivateAccount,
};
