const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate, requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for current user
 * @access  Private
 */
router.get('/', authenticate, notificationController.getUserNotifications);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:notificationId/read', authenticate, notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/mark-all-read', authenticate, notificationController.markAllAsRead);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

/**
 * @route   GET /api/notifications/type/:type
 * @desc    Get notifications by type
 * @access  Private
 */
router.get('/type/:type', authenticate, notificationController.getNotificationsByType);

/**
 * @route   GET /api/notifications/class/:classId
 * @desc    Get notifications for a specific class
 * @access  Private (enrolled students or teaching teachers)
 */
router.get('/class/:classId', authenticate, notificationController.getClassNotifications);

/**
 * @route   POST /api/notifications/deadline-reminders
 * @desc    Create deadline reminders (for admin/cron job)
 * @access  Private (Admin only)
 */
router.post('/deadline-reminders', authenticate, requireAdmin, notificationController.createDeadlineReminders);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private (Admin only)
 */
router.get('/stats', authenticate, requireAdmin, notificationController.getNotificationStats);

/**
 * @route   DELETE /api/notifications/cleanup
 * @desc    Clean up old notifications
 * @access  Private (Admin only)
 */
router.delete('/cleanup', authenticate, requireAdmin, notificationController.cleanupOldNotifications);

module.exports = router;