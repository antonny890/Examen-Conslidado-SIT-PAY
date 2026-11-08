const crypto = require('node:crypto');
const db = require('../config/postgres');

const TABLES = new Set([
  'auditoria_logs',
  'choferes',
  'consultas_dni',
  'empresas',
  'indice_emails',
  'indice_placas',
  'indice_ruc',
  'incidencias_reclamos',
  'metodos_pago',
  'notificaciones',
  'perfiles',
  'roles',
  'solicitudes_preferenciales',
  'tarifas',
  'transacciones',
  'unidades_negocio',
  'usuarios',
  'vehiculos',
]);

const normalizeData = (data) =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value]),
  );

class SqlSnapshot {
  constructor(row) {
    this.exists = Boolean(row);
    this.id = row?.id == null ? null : String(row.id);
    this._row = row || null;
  }

  data() {
    if (!this._row) return undefined;
    const { id, ...data } = this._row;
    return data;
  }
}

class SqlQuery {
  constructor(table, executor = db) {
    if (!TABLES.has(table)) throw new Error(`Tabla no permitida: ${table}`);
    this.tableName = table;
    this.executor = executor;
    this.filters = [];
    this.maxRows = null;
  }

  where(field, operator, value) {
    this.filters.push({ field, operator, value });
    return this;
  }

  limit(count) {
    this.maxRows = count;
    return this;
  }

  buildQuery() {
    let query = this.executor(this.tableName).select('*');
    for (const { field, operator, value } of this.filters) {
      if (operator === '==') query = value == null
        ? query.whereNull(field)
        : query.where(field, value);
      else if (operator === '!=') query = value == null
        ? query.whereNotNull(field)
        : query.whereNot(field, value);
      else if (['>', '>=', '<', '<='].includes(operator)) {
        query = query.where(field, operator, value);
      } else {
        throw new Error(`Operador de consulta no soportado: ${operator}`);
      }
    }
    if (this.maxRows != null) query = query.limit(this.maxRows);
    return query;
  }

  async get() {
    const rows = await this.buildQuery();
    const docs = rows.map((row) => ({
      id: String(row.id),
      data: () => {
        const { id, ...data } = row;
        return data;
      },
    }));
    return { docs, empty: docs.length === 0, size: docs.length };
  }

  row(id = crypto.randomUUID()) {
    return new SqlRowReference(this.tableName, String(id), this.executor);
  }

  doc(id) {
    return this.row(id);
  }
}

class SqlRowReference {
  constructor(table, id, executor = db) {
    if (!TABLES.has(table)) throw new Error(`Tabla no permitida: ${table}`);
    this.tableName = table;
    this.id = id;
    this.executor = executor;
  }

  async get() {
    const row = await this.executor(this.tableName).where({ id: this.id }).first();
    return new SqlSnapshot(row);
  }

  async create(data) {
    const row = { ...normalizeData(data), id: data.id || this.id };
    await this.executor(this.tableName).insert(row);
    return new SqlSnapshot(row);
  }

  async set(data, options = {}) {
    const row = { ...normalizeData(data), id: data.id || this.id };
    let query = this.executor(this.tableName).insert(row);
    if (options.merge) query = query.onConflict('id').merge(normalizeData(data));
    await query;
    return new SqlSnapshot(row);
  }

  async update(data) {
    const values = normalizeData(data);
    delete values.id;
    const updated = await this.executor(this.tableName)
      .where({ id: this.id })
      .update(values);
    if (!updated) {
      const error = new Error(`No existe el registro ${this.id} en ${this.tableName}.`);
      error.code = 'ROW_NOT_FOUND';
      throw error;
    }
  }

  async delete() {
    await this.executor(this.tableName).where({ id: this.id }).delete();
  }
}

const createTransaction = (trx) => ({
  get: async (target) => {
    if (target instanceof SqlRowReference) return target.get();
    if (target instanceof SqlQuery) {
      const rows = await target.buildQuery();
      const docs = rows.map((row) => ({
        id: String(row.id),
        data: () => {
          const { id, ...data } = row;
          return data;
        },
      }));
      return { docs, empty: docs.length === 0, size: docs.length };
    }
    throw new TypeError('La transacción requiere una fila o consulta SQL.');
  },
  create: (reference, data) => trx(reference.tableName)
    .insert({ ...normalizeData(data), id: data.id || reference.id }),
  set: (reference, data, options = {}) => {
    const row = { ...normalizeData(data), id: data.id || reference.id };
    let query = trx(reference.tableName).insert(row);
    if (options.merge) query = query.onConflict('id').merge(normalizeData(data));
    return query;
  },
  update: (reference, data) => {
    const values = normalizeData(data);
    delete values.id;
    return trx(reference.tableName).where({ id: reference.id }).update(values);
  },
  delete: (reference) => trx(reference.tableName).where({ id: reference.id }).delete(),
});

const dbCompat = {
  table: (name) => new SqlQuery(name),
  collection: (name) => new SqlQuery(name),
  row: (table, id) => new SqlRowReference(table, id),
  runTransaction: (callback) => db.transaction((trx) => callback(createTransaction(trx))),
  batch: () => {
    const operations = [];
    return {
      create: (reference, data) => operations.push({ type: 'create', reference, data }),
      update: (reference, data) => operations.push({ type: 'update', reference, data }),
      delete: (reference) => operations.push({ type: 'delete', reference }),
      commit: () => db.transaction(async (trx) => {
        const transaction = createTransaction(trx);
        for (const operation of operations) {
          if (operation.type === 'create') {
            await transaction.create(operation.reference, operation.data);
          } else if (operation.type === 'update') {
            await transaction.update(operation.reference, operation.data);
          } else {
            await transaction.delete(operation.reference);
          }
        }
      }),
    };
  },
};

const serializeValue = (value) => {
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

const getDocument = async (table, id) =>
  dataFromSnapshot(await dbCompat.row(table, String(id)).get());

const listCollection = async (table) => {
  const result = await dbCompat.table(table).get();
  return result.docs.map(dataFromSnapshot);
};

const queryCollection = async (table, field, operator, value) => {
  const result = await dbCompat.table(table).where(field, operator, value).get();
  return result.docs.map(dataFromSnapshot);
};

const createDocument = async (table, value, id) => {
  const reference = dbCompat.row(table, id || crypto.randomUUID());
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
}) => {
  const record = {
    usuario_id: usuarioId,
    accion,
    modulo,
    valores_anteriores: valoresAnteriores,
    valores_nuevos: valoresNuevos,
    created_at: new Date(),
  };
  const reference = dbCompat.row('auditoria_logs');
  await reference.create(record);
  return { id: reference.id, ...record };
};

const writeNotification = ({ usuarioId, titulo, mensaje, tipo, payload = null }) =>
  createDocument('notificaciones', {
    usuario_id: usuarioId,
    titulo,
    mensaje,
    tipo,
    payload,
    leido: false,
  });

const timestampToDate = (value) => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return null;
};

module.exports = {
  createDocument,
  dataFromSnapshot,
  db: dbCompat,
  getDocument,
  listCollection,
  queryCollection,
  timestampToDate,
  writeAuditLog,
  writeNotification,
};
