const { db } = require('../config/firebase');

const serializeValue = (value) => {
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeValue(item)]),
    );
  }
  return value;
};

const dataFromSnapshot = (snapshot) =>
  snapshot.exists ? { id: snapshot.id, ...serializeValue(snapshot.data()) } : null;

const getDocument = async (collection, id) =>
  dataFromSnapshot(await db.collection(collection).doc(String(id)).get());

const listCollection = async (collection) => {
  const snapshot = await db.collection(collection).get();
  return snapshot.docs.map(dataFromSnapshot);
};

const queryCollection = async (collection, field, operator, value) => {
  const snapshot = await db.collection(collection).where(field, operator, value).get();
  return snapshot.docs.map(dataFromSnapshot);
};

const createDocument = async (collection, value, id) => {
  const reference = id
    ? db.collection(collection).doc(String(id))
    : db.collection(collection).doc();
  const now = new Date();
  const record = { ...value, created_at: value.created_at || now, updated_at: now };
  await reference.create(record);
  return { id: reference.id, ...record };
};

const writeAuditLog = async ({
  usuarioId,
  accion,
  modulo,
  valoresAnteriores = null,
  valoresNuevos = null,
}) =>
  createDocument('auditoria_logs', {
    usuario_id: usuarioId,
    accion,
    modulo,
    valores_anteriores: valoresAnteriores,
    valores_nuevos: valoresNuevos,
  });

const writeNotification = async ({ usuarioId, titulo, mensaje, tipo, payload = null }) =>
  createDocument('notificaciones', {
    usuario_id: usuarioId,
    titulo,
    mensaje,
    tipo,
    payload,
    leida: false,
  });

const timestampToDate = (value) => {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return null;
};

module.exports = {
  createDocument,
  dataFromSnapshot,
  db,
  getDocument,
  listCollection,
  queryCollection,
  timestampToDate,
  writeAuditLog,
  writeNotification,
};
