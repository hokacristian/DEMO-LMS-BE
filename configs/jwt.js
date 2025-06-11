const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token
 * @param {Object} payload - User data to encode
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'lms-backend',
    audience: 'lms-users'
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'lms-backend',
    audience: 'lms-users'
  });
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded payload
 */
const decodeToken = (token) => {
  return jwt.decode(token, { complete: true });
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  JWT_SECRET,
  JWT_EXPIRES_IN
};