/**
 * Generador de códigos QR para vehículos del SIT Arequipa
 * El código QR codifica un identificador criptográfico/opaco único del vehículo,
 * garantizando que NUNCA exponga tarifas, saldos ni datos personales (Ley 29733).
 */
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Genera un token opaco único para asociar a una placa
 * @param {string} placa - Ej. 'V7A-890'
 * @returns {string} - Ej. 'SIT-VEH-V7A890-9B2F5C8D'
 */
const generateSecureVehicleToken = (placa) => {
  const cleanPlate = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const randomSuffix = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `SIT-VEH-${cleanPlate}-${randomSuffix}`;
};

/**
 * Genera código QR en formato SVG vectorial
 * @param {string} qrSecureToken
 * @returns {Promise<string>}
 */
const generateQRCodeSVG = async (qrSecureToken) => {
  return QRCode.toString(qrSecureToken, {
    type: 'svg',
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
    margin: 2,
  });
};

/**
 * Genera código QR en formato Base64 Data URL (PNG)
 * @param {string} qrSecureToken
 * @returns {Promise<string>}
 */
const generateQRCodeDataURL = async (qrSecureToken) => {
  return QRCode.toDataURL(qrSecureToken, {
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 350,
  });
};

module.exports = {
  generateSecureVehicleToken,
  generateQRCodeSVG,
  generateQRCodeDataURL,
};
