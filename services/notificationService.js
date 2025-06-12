const prisma = require('../configs/prisma');

class NotificationService {
  /**
   * Create notification when new assignment is published
   */
  async createAssignmentNotification(classId, assignment) {
    try {
      // Create notification
      const notification = await prisma.notification.create({
        data: {
          title: `Tugas Baru: ${assignment.title}`,
          message: `Tugas baru telah ditambahkan di kelas ${assignment.class.name}. Deadline: ${this.formatDeadline(assignment.deadline)}`,
          type: 'ASSIGNMENT_CREATED',
          classId: parseInt(classId),
          assignmentId: assignment.id
        }
      });

      // Get all students in the class
      const students = await this.getClassStudents(classId);

      // Create user notifications for each student
      const userNotifications = students.map(student => ({
        userId: student.id,
        notificationId: notification.id,
        isRead: false
      }));

      if (userNotifications.length > 0) {
        await prisma.userNotification.createMany({
          data: userNotifications
        });
      }

      return notification;
    } catch (error) {
      console.error('Error creating assignment notification:', error);
      throw error;
    }
  }

  /**
   * Create notification when new material is uploaded
   */
  async createMaterialNotification(classId, material) {
    try {
      // Create notification
      const notification = await prisma.notification.create({
        data: {
          title: `Materi Baru: ${material.title}`,
          message: `Materi baru telah ditambahkan di kelas ${material.class.name} oleh ${material.teacher.name}`,
          type: 'MATERIAL_UPLOADED',
          classId: parseInt(classId),
          materialId: material.id
        }
      });

      // Get all students in the class
      const students = await this.getClassStudents(classId);

      // Create user notifications for each student
      const userNotifications = students.map(student => ({
        userId: student.id,
        notificationId: notification.id,
        isRead: false
      }));

      if (userNotifications.length > 0) {
        await prisma.userNotification.createMany({
          data: userNotifications
        });
      }

      return notification;
    } catch (error) {
      console.error('Error creating material notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId, limit = 20, offset = 0) {
    const notifications = await prisma.userNotification.findMany({
      where: { userId: parseInt(userId) },
      include: {
        notification: {
          include: {
            // Include related data based on notification type
            ...(true && {
              // This will include all related fields
            })
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    // Format notifications with additional context
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

    return formattedNotifications;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userNotificationId, userId) {
    const userNotification = await prisma.userNotification.findFirst({
      where: {
        id: parseInt(userNotificationId),
        userId: parseInt(userId)
      }
    });

    if (!userNotification) {
      throw new Error('Notifikasi tidak ditemukan');
    }

    if (userNotification.isRead) {
      return userNotification; // Already read
    }

    const updatedNotification = await prisma.userNotification.update({
      where: { id: parseInt(userNotificationId) },
      data: {
        isRead: true,
        readAt: new Date()
      },
      include: {
        notification: true
      }
    });

    return updatedNotification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    const result = await prisma.userNotification.updateMany({
      where: {
        userId: parseInt(userId),
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return { message: `${result.count} notifikasi ditandai sudah dibaca` };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId) {
    const count = await prisma.userNotification.count({
      where: {
        userId: parseInt(userId),
        isRead: false
      }
    });

    return { unreadCount: count };
  }

  /**
   * Create assignment deadline reminder notifications
   * This would typically be called by a cron job
   */
  async createDeadlineReminders() {
    try {
      // Find assignments with deadline in next 24 hours that haven't been reminded
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const today = new Date();

      const assignments = await prisma.assignment.findMany({
        where: {
          deadline: {
            gte: today,
            lte: tomorrow
          },
          status: 'PUBLISHED'
        },
        include: {
          class: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      for (const assignment of assignments) {
        // Check if reminder already sent today
        const existingReminder = await prisma.notification.findFirst({
          where: {
            type: 'ASSIGNMENT_DEADLINE_REMINDER',
            assignmentId: assignment.id,
            createdAt: {
              gte: new Date(today.setHours(0, 0, 0, 0))
            }
          }
        });

        if (!existingReminder) {
          // Create reminder notification
          const notification = await prisma.notification.create({
            data: {
              title: `Reminder: ${assignment.title}`,
              message: `Deadline tugas "${assignment.title}" adalah ${this.formatDeadline(assignment.deadline)}. Jangan lupa untuk mengumpulkan!`,
              type: 'ASSIGNMENT_DEADLINE_REMINDER',
              classId: assignment.classId,
              assignmentId: assignment.id
            }
          });

          // Get students who haven't submitted yet
          const students = await this.getClassStudents(assignment.classId);
          const submittedStudents = await prisma.submission.findMany({
            where: {
              assignmentId: assignment.id,
              isLatest: true
            },
            select: {
              studentId: true
            }
          });

          const submittedStudentIds = submittedStudents.map(s => s.studentId);
          const unsubmittedStudents = students.filter(student => 
            !submittedStudentIds.includes(student.id)
          );

          // Create notifications only for students who haven't submitted
          if (unsubmittedStudents.length > 0) {
            const userNotifications = unsubmittedStudents.map(student => ({
              userId: student.id,
              notificationId: notification.id,
              isRead: false
            }));

            await prisma.userNotification.createMany({
              data: userNotifications
            });
          }
        }
      }

      return { message: 'Deadline reminders created successfully' };
    } catch (error) {
      console.error('Error creating deadline reminders:', error);
      throw error;
    }
  }

  /**
   * Get all students in a class
   */
  async getClassStudents(classId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: parseInt(classId) },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return enrollments.map(enrollment => enrollment.student);
  }

  /**
   * Format deadline for display
   */
  formatDeadline(deadline) {
    return new Date(deadline).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Clean up old notifications (optional - for maintenance)
   */
  async cleanupOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    return { message: `${result.count} notifikasi lama telah dihapus` };
  }

  /**
   * Get notification statistics for admin
   */
  async getNotificationStats() {
    const stats = await prisma.notification.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    });

    const totalNotifications = await prisma.notification.count();
    const totalUserNotifications = await prisma.userNotification.count();
    const unreadNotifications = await prisma.userNotification.count({
      where: { isRead: false }
    });

    return {
      totalNotifications,
      totalUserNotifications,
      unreadNotifications,
      notificationsByType: stats
    };
  }
}

module.exports = new NotificationService();