const bcrypt = require('bcryptjs');
const prisma = require('../configs/prisma');
const { generateToken } = require('../configs/jwt');

class AuthService {
  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Object} Created user and token
   */
  async register(userData) {
    const { email, name, password, role = 'STUDENT' } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('Email sudah terdaftar');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role.toUpperCase()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // // Generate token
    // const token = generateToken({
    //   userId: user.id,
    //   email: user.email,
    //   role: user.role
    // });

    // return {
    //   user,
    //   token,
    //   expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    // };
  }

  /**
   * Login user
   * @param {Object} loginData - Login credentials
   * @returns {Object} User and token
   */
  async login(loginData) {
    const { email, password } = loginData;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Email atau password tidak valid');
    }

    // // Check if user is active
    // if (!user.isActive) {
    //   throw new Error('Akun Anda tidak aktif. Hubungi administrator');
    // }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Email atau password tidak valid');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      role: user.role,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    };
  }

  /**
   * Get user profile by ID
   * @param {string} userId - User ID
   * @returns {Object} User profile
   */
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    return user;
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  async updateProfile(userId, updateData) {
    const { name, email } = updateData;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        throw new Error('Email sudah digunakan oleh user lain');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return updatedUser;
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {Object} passwordData - Password change data
   * @returns {boolean} Success status
   */
  async changePassword(userId, passwordData) {
    const { currentPassword, newPassword } = passwordData;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Password saat ini tidak valid');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    return true;
  }

  /**
   * Verify user token and get user data
   * @param {string} userId - User ID from token
   * @returns {Object} User data
   */
  async verifyUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    return user;
  }
}

module.exports = new AuthService();