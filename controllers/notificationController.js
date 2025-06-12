const Joi = require('joi');
const notificationService = require('../services/notificationService');
const prisma = require('../configs/prisma');

class NotificationController {
  /**
   * Get notifications for current user
   */
  async getUserNotifications(req, res) {
    try {
      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // Validate pagination
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'Parameter pagination tidak valid (page >= 1, limit 1-100)'
        });
      }

      const notifications = await notificationService.getUserNotifications(
        req.user.id,
        limit,
        offset
      );

      res.json({
        success: true,
        message: 'Notifikasi berhasil diambil',
        data: {
          notifications,
          pagination: {
            page,
            limit,
            total: notifications.length,
            hasMore: notifications.length === limit
          }
        }
      });
    } catch (error) {
      console.error('Get user notifications error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil notifikasi'
      });
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;

      // Validate notification ID
      if (!notificationId || isNaN(parseInt(notificationId))) {
        return res.status(400).json({
          success: false,
          message: 'ID notifikasi tidak valid'
        });
      }

      const updatedNotification = await notificationService.markAsRead(
        notificationId,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Notifikasi ditandai sudah dibaca',
        data: { notification: updatedNotification }
      });
    } catch (error) {
      console.error('Mark notification as read error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal menandai notifikasi sebagai dibaca'
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      const result = await notificationService.markAllAsRead(req.user.id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal menandai semua notifikasi sebagai dibaca'
      });
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(req, res) {
    try {
      const result = await notificationService.getUnreadCount(req.user.id);

      res.json({
        success: true,
        message: 'Jumlah notifikasi belum dibaca berhasil diambil',
        data: result
      });
    } catch (error) {
      console.error('Get unread count error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil jumlah notifikasi belum dibaca'
      });
    }
  }

  /**
   * Get filtered notifications by type
   */
  async getNotificationsByType(req, res) {
    try {
      const { type } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // Validate notification type
      const validTypes = [
        'ASSIGNMENT_CREATED',
        'ASSIGNMENT_UPDATED', 
        'ASSIGNMENT_DEADLINE_REMINDER',
        'MATERIAL_UPLOADED',
        'GRADE_PUBLISHED',
        'QUIZ_CREATED',
        'QUIZ_UPDATED'
      ];

      if (!validTypes.includes(type.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Tipe notifikasi tidak valid',
          data: { validTypes }
        });
      }

      // Get notifications with type filter
      const notifications = await prisma.userNotification.findMany({
        where: { 
          userId: parseInt(req.user.id),
          notification: {
            type: type.toUpperCase()
          }
        },
        include: {
          notification: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      // Format notifications
      const formattedNotifications = notifications.map(userNotif => ({
        id: userNotif.id,
        title: userNotif.notification.title,
        message: userNotif.notification.message,
        type: userNotif.notification.type,
        isRead: userNotif.isRead,
        readAt: userNotif.readAt,
        createdAt: userNotif.createdAt,
        relatedData: {
          classId: userNotif.notification.classId,
          assignmentId: userNotif.notification.assignmentId,
          materialId: userNotif.notification.materialId,
          quizId: userNotif.notification.quizId
        }
      }));

      res.json({
        success: true,
        message: `Notifikasi tipe ${type} berhasil diambil`,
        data: {
          notifications: formattedNotifications,
          type: type.toUpperCase(),
          pagination: {
            page,
            limit,
            total: formattedNotifications.length,
            hasMore: formattedNotifications.length === limit
          }
        }
      });
    } catch (error) {
      console.error('Get notifications by type error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil notifikasi berdasarkan tipe'
      });
    }
  }

  /**
   * Get notifications for a specific class (for students in that class) - INI YANG MISSING!
   */
  async getClassNotifications(req, res) {
    try {
      const { classId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // Verify user has access to this class
      let hasAccess = false;

      if (req.user.role === 'STUDENT') {
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            studentId: parseInt(req.user.id),
            classId: parseInt(classId)
          }
        });
        hasAccess = !!enrollment;
      } else if (req.user.role === 'TEACHER') {
        const teacherClass = await prisma.teacherClass.findFirst({
          where: {
            teacherId: parseInt(req.user.id),
            classId: parseInt(classId)
          }
        });
        hasAccess = !!teacherClass;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke kelas ini'
        });
      }

      // Get class notifications
      const notifications = await prisma.userNotification.findMany({
        where: {
          userId: parseInt(req.user.id),
          notification: {
            classId: parseInt(classId)
          }
        },
        include: {
          notification: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      // Format notifications
      const formattedNotifications = notifications.map(userNotif => ({
        id: userNotif.id,
        title: userNotif.notification.title,
        message: userNotif.notification.message,
        type: userNotif.notification.type,
        isRead: userNotif.isRead,
        readAt: userNotif.readAt,
        createdAt: userNotif.createdAt,
        relatedData: {
          classId: userNotif.notification.classId,
          assignmentId: userNotif.notification.assignmentId,
          materialId: userNotif.notification.materialId,
          quizId: userNotif.notification.quizId
        }
      }));

      res.json({
        success: true,
        message: 'Notifikasi kelas berhasil diambil',
        data: {
          notifications: formattedNotifications,
          classId: parseInt(classId),
          pagination: {
            page,
            limit,
            total: formattedNotifications.length,
            hasMore: formattedNotifications.length === limit
          }
        }
      });
    } catch (error) {
      console.error('Get class notifications error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil notifikasi kelas'
      });
    }
  }

  /**
   * Create deadline reminders (for admin/cron job)
   */
  async createDeadlineReminders(req, res) {
    try {
      // Only admin can manually trigger deadline reminders
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Hanya admin yang dapat membuat reminder deadline'
        });
      }

      const result = await notificationService.createDeadlineReminders();

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Create deadline reminders error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal membuat reminder deadline'
      });
    }
  }

  /**
   * Get notification statistics (for admin)
   */
  async getNotificationStats(req, res) {
    try {
      // Only admin can view notification statistics
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Hanya admin yang dapat melihat statistik notifikasi'
        });
      }

      const stats = await notificationService.getNotificationStats();

      res.json({
        success: true,
        message: 'Statistik notifikasi berhasil diambil',
        data: { stats }
      });
    } catch (error) {
      console.error('Get notification stats error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil statistik notifikasi'
      });
    }
  }

  /**
   * Clean up old notifications (for admin/maintenance)
   */
  async cleanupOldNotifications(req, res) {
    try {
      // Only admin can cleanup notifications
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Hanya admin yang dapat membersihkan notifikasi lama'
        });
      }

      // Validate days parameter
      const daysOld = parseInt(req.query.daysOld) || 30;
      
      if (daysOld < 7) {
        return res.status(400).json({
          success: false,
          message: 'Minimal 7 hari untuk cleanup notifikasi'
        });
      }

      const result = await notificationService.cleanupOldNotifications(daysOld);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Cleanup old notifications error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal membersihkan notifikasi lama'
      });
    }
  }
}

module.exports = new NotificationController();