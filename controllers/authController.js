const Joi = require('joi');
const authService = require('../services/authService');

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Format email tidak valid',
    'any.required': 'Email wajib diisi'
  }),
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Nama minimal 2 karakter',
    'string.max': 'Nama maksimal 100 karakter',
    'any.required': 'Nama wajib diisi'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password minimal 6 karakter',
    'any.required': 'Password wajib diisi'
  }),
  role: Joi.string().valid('ADMIN', 'TEACHER', 'STUDENT').default('STUDENT').messages({
    'any.only': 'Role harus ADMIN, TEACHER, atau STUDENT'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Format email tidak valid',
    'any.required': 'Email wajib diisi'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password wajib diisi'
  })
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).messages({
    'string.min': 'Nama minimal 2 karakter',
    'string.max': 'Nama maksimal 100 karakter'
  }),
  email: Joi.string().email().messages({
    'string.email': 'Format email tidak valid'
  })
}).min(1).messages({
  'object.min': 'Minimal satu field harus diisi'
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Password saat ini wajib diisi'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'Password baru minimal 6 karakter',
    'any.required': 'Password baru wajib diisi'
  }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Konfirmasi password tidak cocok',
    'any.required': 'Konfirmasi password wajib diisi'
  })
});

class AuthController {
  /**
   * Register new user
   */
  async register(req, res) {
    try {
      // Validate request body
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Register user
      const result = await authService.register(value);

      res.status(201).json({
        success: true,
        message: 'Registrasi berhasil',
        data: result
      });
    } catch (error) {
      console.error('Register error:', error.message);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Registrasi gagal'
      });
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      // Validate request body
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Login user
      const result = await authService.login(value);

      res.json({
        success: true,
        message: 'Login berhasil',
        data: result
      });
    } catch (error) {
      console.error('Login error:', error.message);
      
      res.status(401).json({
        success: false,
        message: error.message || 'Login gagal'
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const user = await authService.getProfile(req.user.id);

      res.json({
        success: true,
        message: 'Profile berhasil diambil',
        data: { user }
      });
    } catch (error) {
      console.error('Get profile error:', error.message);
      
      res.status(404).json({
        success: false,
        message: error.message || 'Profile tidak ditemukan'
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      // Validate request body
      const { error, value } = updateProfileSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Update profile
      const user = await authService.updateProfile(req.user.id, value);

      res.json({
        success: true,
        message: 'Profile berhasil diupdate',
        data: { user }
      });
    } catch (error) {
      console.error('Update profile error:', error.message);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Update profile gagal'
      });
    }
  }

  /**
   * Change user password
   */
  async changePassword(req, res) {
    try {
      // Validate request body
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Change password
      await authService.changePassword(req.user.id, value);

      res.json({
        success: true,
        message: 'Password berhasil diubah'
      });
    } catch (error) {
      console.error('Change password error:', error.message);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Ubah password gagal'
      });
    }
  }

  /**
   * Logout user (client-side token removal)
   */
  async logout(req, res) {
    try {
      // In a JWT implementation, logout is typically handled client-side
      // by removing the token. Here we just send a success response.
      // You could implement token blacklisting if needed.
      
      res.json({
        success: true,
        message: 'Logout berhasil'
      });
    } catch (error) {
      console.error('Logout error:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Logout gagal'
      });
    }
  }

  /**
   * Verify token (for frontend auth checks)
   */
  async verifyToken(req, res) {
    try {
      // If we reach here, token is valid (middleware passed)
      res.json({
        success: true,
        message: 'Token valid',
        data: {
          user: req.user
        }
      });
    } catch (error) {
      console.error('Verify token error:', error.message);
      
      res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
  }
}

module.exports = new AuthController();