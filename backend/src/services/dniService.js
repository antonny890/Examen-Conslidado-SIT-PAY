class DniProviderError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'DniProviderError';
    this.status = status;
    this.code = code;
  }
}

async function lookupDniName(dni) {
  if (!/^\d{8}$/.test(dni)) {
    throw new DniProviderError(400, 'El DNI debe tener exactamente 8 dígitos.');
  }

  const token = process.env.MIGO_API_TOKEN;
  if (!token) {
    throw new DniProviderError(
      503,
      'La consulta de DNI no está configurada.',
      'DNI_PROVIDER_NOT_CONFIGURED',
    );
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
      throw new DniProviderError(
        502,
        'El proveedor de consulta DNI devolvió una respuesta inválida.',
      );
    }

    const fullName = typeof result?.nombre === 'string'
      ? result.nombre.trim()
      : '';
    if (response.ok && result?.success === true && fullName) {
      return fullName;
    }

    throw new DniProviderError(
      response.status === 404 ? 404 : 502,
      'No se pudo verificar el DNI. Revisa el número e inténtalo nuevamente.',
    );
  } catch (error) {
    if (error instanceof DniProviderError) throw error;
    if (error.name === 'AbortError') {
      throw new DniProviderError(
        504,
        'La consulta de DNI tardó demasiado. Inténtalo nuevamente.',
      );
    }
    throw new DniProviderError(
      502,
      'No se pudo conectar con el proveedor de consulta DNI.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

function parseDniName(fullName) {
  const parts = fullName
    .replaceAll('_', ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length < 3) {
    throw new DniProviderError(
      502,
      'El proveedor no devolvió nombres y apellidos completos para el DNI.',
    );
  }

  return {
    apellidos: parts.slice(0, 2).join(' '),
    nombres: parts.slice(2).join(' '),
  };
}

module.exports = { DniProviderError, lookupDniName, parseDniName };
