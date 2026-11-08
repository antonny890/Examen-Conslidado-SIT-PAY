const crypto = require('node:crypto');
const { db } = require('../../config/firebase');
const {
  DniProviderError,
  lookupDniName,
  parseDniName,
} = require('../../services/dniService');

const lookupDni = async (req, res, next) => {
  const dni = typeof req.body?.dni === 'string' ? req.body.dni.trim() : '';
  if (req.body?.consentimientoConsultaDni !== true) {
    return res.status(400).json({
      success: false,
      message: 'Debes autorizar la consulta de identidad antes de consultar el DNI.',
    });
  }

  try {
    const nombre = await lookupDniName(dni);
    const identity = parseDniName(nombre);
    const consultadoAt = new Date();
    const dniHash = crypto.createHash('sha256').update(dni).digest('hex');
    await db.collection('consultas_dni').doc(dniHash).set({
      numero_documento: dni,
      datos_proveedor: {
        dni,
        nombre,
        nombres: identity.nombres,
        apellidos: identity.apellidos,
      },
      fuente: 'MIGO',
      estado_consulta: 'CONSULTADA',
      verificacion_oficial: false,
      consultado_at: consultadoAt,
      updated_at: consultadoAt,
    }, { merge: true });

    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      data: {
        dni,
        nombre,
        nombres: identity.nombres,
        apellidos: identity.apellidos,
        fuente: 'MIGO',
        estadoConsulta: 'CONSULTADA',
        verificacionOficial: false,
        consultadoAt: consultadoAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof DniProviderError) {
      return res.status(error.status).json({
        success: false,
        ...(error.code ? { code: error.code } : {}),
        message: error.message,
      });
    }
    return next(error);
  }
};

module.exports = { lookupDni };
