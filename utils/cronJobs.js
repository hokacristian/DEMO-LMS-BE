const cron = require('node-cron');
const notificationService = require('../services/notificationService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class CronJobs {
  /**
   * Initialize all cron jobs
   */
  static initializeCronJobs() {
    console.log('⏰ Initializing cron jobs...');

    // Assignment deadline reminders - runs every day at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
      console.log('🔔 Running assignment deadline reminders...');
      try {
        await notificationService.createDeadlineReminders();
        console.log('✅ Assignment deadline reminders completed');
      } catch (error) {
        console.error('❌ Error in deadline reminders:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jakarta"
    });

    // Assignment deadline reminders - runs every day at 6:00 PM
    cron.schedule('0 18 * * *', async () => {
      console.log('🔔 Running evening assignment deadline reminders...');
      try {
        await notificationService.createDeadlineReminders();
        console.log('✅ Evening assignment deadline reminders completed');
      } catch (error) {
        console.error('❌ Error in evening deadline reminders:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jakarta"
    });

    // Cleanup old notifications - runs every Sunday at 2:00 AM
    cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 Running notification cleanup...');
      try {
        const result = await notificationService.cleanupOldNotifications(30); // 30 days old
        console.log('✅ Notification cleanup completed:', result.message);
      } catch (error) {
        console.error('❌ Error in notification cleanup:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jakarta"
    });

    // Close expired assignments - runs every day at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('🕛 Running assignment closure check...');
      try {
        await this.closeExpiredAssignments();
        console.log('✅ Assignment closure check completed');
      } catch (error) {
        console.error('❌ Error in assignment closure:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jakarta"
    });

    // Database cleanup and maintenance - runs every day at 3:00 AM
    cron.schedule('0 3 * * *', async () => {
      console.log('🔧 Running database maintenance...');
      try {
        await this.runDatabaseMaintenance();
        console.log('✅ Database maintenance completed');
      } catch (error) {
        console.error('❌ Error in database maintenance:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jakarta"
    });

    // Generate daily statistics - runs every day at 11:30 PM
    cron.schedule('30 23 * * *', async () => {
      console.log('📊 Generating daily statistics...');
      try {
        await this.generateDailyStats();
        console.log('✅ Daily statistics generated');
      } catch (error) {
        console.error('❌ Error generating daily statistics:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jakarta"
    });

    // File cleanup for deleted submissions - runs every hour
    cron.schedule('0 * * * *', async () => {
      console.log('🗂️ Running file cleanup...');
      try {
        await this.cleanupOrphanedFiles();
        console.log('✅ File cleanup completed');
      } catch (error) {
        console.error('❌ Error in file cleanup:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jakarta"
    });

    console.log('✅ All cron jobs initialized successfully');
  }

  /**
   * Close assignments that have passed their deadline
   */
  static async closeExpiredAssignments() {
    const now = new Date();
    
    const expiredAssignments = await prisma.assignment.updateMany({
      where: {
        deadline: {
          lt: now
        },
        status: 'PUBLISHED'
      },
      data: {
        status: 'CLOSED'
      }
    });

    console.log(`📝 Closed ${expiredAssignments.count} expired assignments`);
    return expiredAssignments;
  }

  /**
   * Run database maintenance tasks
   */
  static async runDatabaseMaintenance() {
    try {
      // Update submission late status for any missed ones
      const submissions = await prisma.submission.findMany({
        where: {
          isLate: false,
          submittedAt: {
            gt: prisma.$queryRaw`SELECT deadline FROM assignments WHERE id = assignment_id`
          }
        },
        include: {
          assignment: {
            select: {
              deadline: true
            }
          }
        }
      });

      for (const submission of submissions) {
        const lateByMinutes = Math.floor(
          (submission.submittedAt - submission.assignment.deadline) / (1000 * 60)
        );

        if (lateByMinutes > 0) {
          await prisma.submission.update({
            where: { id: submission.id },
            data: {
              isLate: true,
              lateByMinutes: lateByMinutes
            }
          });
        }
      }

      // Mark old submissions as not latest if needed
      await prisma.$executeRaw`
        UPDATE submissions 
        SET is_latest = false 
        WHERE id NOT IN (
          SELECT DISTINCT ON (assignment_id, student_id) id 
          FROM submissions 
          ORDER BY assignment_id, student_id, version DESC
        )
      `;

      console.log('🔧 Database maintenance tasks completed');
    } catch (error) {
      console.error('❌ Database maintenance error:', error);
      throw error;
    }
  }

  /**
   * Generate daily statistics
   */
  static async generateDailyStats() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Count today's activities
      const stats = {
        date: startOfDay,
        newSubmissions: await prisma.submission.count({
          where: {
            submittedAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        }),
        newMaterials: await prisma.material.count({
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        }),
        newAssignments: await prisma.assignment.count({
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        }),
        newEnrollments: await prisma.enrollment.count({
          where: {
            enrolledAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        }),
        activeUsers: await prisma.user.count({
          where: {
            // This would need a lastActive field in the user model
            // For now, just count all users
          }
        })
      };

      console.log('📊 Daily statistics:', stats);
      
      // You could save these stats to a separate table for analytics
      // await prisma.dailyStats.create({ data: stats });

      return stats;
    } catch (error) {
      console.error('❌ Error generating daily statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned files from storage
   */
  static async cleanupOrphanedFiles() {
    try {
      // Find submissions that have previousFileUrl but are older than 24 hours
      const oldSubmissions = await prisma.submission.findMany({
        where: {
          previousFileUrl: {
            not: null
          },
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
          }
        },
        select: {
          id: true,
          previousFileUrl: true
        }
      });

      for (const submission of oldSubmissions) {
        // TODO: Delete file from Supabase Storage
        console.log(`🗑️ Scheduling cleanup for file: ${submission.previousFileUrl}`);
        
        // Clear the previousFileUrl after scheduling cleanup
        await prisma.submission.update({
          where: { id: submission.id },
          data: { previousFileUrl: null }
        });
      }

      console.log(`🗂️ Processed ${oldSubmissions.length} files for cleanup`);
      return oldSubmissions.length;
    } catch (error) {
      console.error('❌ Error in file cleanup:', error);
      throw error;
    }
  }

  /**
   * Stop all cron jobs (useful for testing or shutdown)
   */
  static stopAllJobs() {
    console.log('⏹️ Stopping all cron jobs...');
    cron.getTasks().forEach(task => task.stop());
    console.log('✅ All cron jobs stopped');
  }
}

module.exports = CronJobs;