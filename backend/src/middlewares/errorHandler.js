/**
 * Manejador global centralizado de errores para la API REST
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Error SIT-Pay]:', err);

  // Errores de validación de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Cuerpo de petición JSON malformado.',
    });
  }

  // Error genérico controlado
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Error interno del servidor. Por favor intente más tarde.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
