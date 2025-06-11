const { verifyToken } = require('../configs/jwt');
const authService = require('../services/authService');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token akses diperlukan'
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Format token tidak valid'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Get user data
    const user = await authService.verifyUser(decoded.userId);
    
    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    let message = 'Token tidak valid';
    let statusCode = 401;

    if (error.name === 'TokenExpiredError') {
      message = 'Token sudah kadaluarsa';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Token tidak valid';
    } else if (error.message.includes('tidak ditemukan')) {
      message = 'User tidak ditemukan';
    } else if (error.message.includes('tidak aktif')) {
      message = 'Akun tidak aktif';
    }

    return res.status(statusCode).json({
      success: false,
      message
    });
  }
};

/**
 * Authorization middleware - check user role
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Convert to array if single role provided
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      
      // Check if user role is allowed
      if (roles.length > 0 && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak. Role tidak mencukupi'
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error.message);
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak'
      });
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work for both authenticated and non-authenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return next();
    }

    // Try to verify token
    const decoded = verifyToken(token);
    const user = await authService.verifyUser(decoded.userId);
    
    // Attach user to request if valid
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    console.warn('Optional auth failed:', error.message);
    next();
  }
};

/**
 * Role-specific middleware helpers
 */
const requireAdmin = authorize(['ADMIN']);
const requireTeacher = authorize(['ADMIN', 'TEACHER']);
const requireStudent = authorize(['ADMIN', 'TEACHER', 'STUDENT']);

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  requireAdmin,
  requireTeacher,
  requireStudent
};