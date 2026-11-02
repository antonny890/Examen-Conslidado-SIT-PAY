const lookupDni = async (req, res) => {
  const dni = typeof req.body?.dni === 'string' ? req.body.dni.trim() : '';

  if (!/^\d{8}$/.test(dni)) {
    return res.status(400).json({
      success: false,
      message: 'El DNI debe tener exactamente 8 dígitos.',
    });
  }

  const token = process.env.MIGO_API_TOKEN;
  if (!token) {
    return res.status(503).json({
      success: false,
      code: 'DNI_PROVIDER_NOT_CONFIGURED',
      message: 'La consulta de DNI no está configurada.',
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`https://api.migo.pe/api/v2/dni/${dni}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    let result;
    try {
      result = await response.json();
    } catch {
      return res.status(502).json({
        success: false,
        message: 'El proveedor de consulta DNI devolvió una respuesta inválida.',
      });
    }

    const fullName = typeof result?.nombre === 'string' ? result.nombre.trim() : '';
    if (response.ok && result?.success === true && fullName) {
      res.set('Cache-Control', 'no-store');
      return res.json({
        success: true,
        data: { dni, nombre: fullName },
      });
    }

    return res.status(response.status === 404 ? 404 : 502).json({
      success: false,
      message: 'No se pudo verificar el DNI. Revisa el número e inténtalo nuevamente.',
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        message: 'La consulta de DNI tardó demasiado. Inténtalo nuevamente.',
      });
    }

    return res.status(502).json({
      success: false,
      message: 'No se pudo conectar con el proveedor de consulta DNI.',
    });
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { lookupDni };
