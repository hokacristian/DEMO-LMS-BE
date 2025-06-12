const prisma = require('../configs/prisma');
const notificationService = require('./notificationService');
const uploadService = require('./uploadService');


class AssignmentService {
  /**
   * Create new assignment (only for TEACHER)
   */
  async createAssignment(teacherId, assignmentData, fileData = null) {
    const { 
      title, 
      description, 
      instruction, 
      deadline, 
      maxScore, 
      classId 
    } = assignmentData;

    // Verify teacher has access to this class
    const teacherClass = await prisma.teacherClass.findFirst({
      where: {
        teacherId: parseInt(teacherId),
        classId: parseInt(classId)
      }
    });

    if (!teacherClass) {
      throw new Error('Anda tidak memiliki akses untuk menambah tugas di kelas ini');
    }

    // Prepare assignment data
    const assignmentCreate = {
      title,
      description,
      instruction,
      deadline: new Date(deadline),
      maxScore: maxScore ? parseInt(maxScore) : 100,
      classId: parseInt(classId),
      teacherId: parseInt(teacherId),
      status: 'DRAFT' // Always start as DRAFT
    };

    // Add file data if exists
    if (fileData) {
      assignmentCreate.fileUrl = fileData.fileUrl;
      assignmentCreate.fileName = fileData.fileName;
    }

    // Create assignment
    const assignment = await prisma.assignment.create({
      data: assignmentCreate,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return assignment;
  }

  /**
   * Publish assignment (change status from DRAFT to PUBLISHED)
   */
  async publishAssignment(assignmentId, teacherId) {
    // Check if assignment exists and teacher owns it
    const assignment = await prisma.assignment.findUnique({
      where: { id: parseInt(assignmentId) },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            subject: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!assignment) {
      throw new Error('Tugas tidak ditemukan');
    }

    if (assignment.teacherId !== parseInt(teacherId)) {
      throw new Error('Anda tidak memiliki akses untuk mempublikasi tugas ini');
    }

    if (assignment.status === 'PUBLISHED') {
      throw new Error('Tugas sudah dipublikasi');
    }

    // Update status to PUBLISHED
    const publishedAssignment = await prisma.assignment.update({
      where: { id: parseInt(assignmentId) },
      data: { status: 'PUBLISHED' },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Send notification to students
    await notificationService.createAssignmentNotification(assignment.classId, publishedAssignment);

    return publishedAssignment;
  }

  /**
   * Get assignments for a class
   */
  async getClassAssignments(classId, userId, userRole) {
    // Verify user has access to this class
    await this.verifyClassAccess(classId, userId, userRole);

    // Different view for teacher vs student
    const whereCondition = { classId: parseInt(classId) };
    
    // Students only see published assignments
    if (userRole === 'STUDENT') {
      whereCondition.status = 'PUBLISHED';
    }

    const assignments = await prisma.assignment.findMany({
      where: whereCondition,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            submissions: userRole === 'TEACHER' ? true : false
          }
        },
        // Include student's submission if user is student
        ...(userRole === 'STUDENT' && {
          submissions: {
            where: {
              studentId: parseInt(userId),
              isLatest: true
            },
            select: {
              id: true,
              version: true,
              submittedAt: true,
              score: true,
              status: true,
              isLate: true,
              lateByMinutes: true
            }
          }
        })
      },
      orderBy: {
        deadline: 'asc'
      }
    });

    return assignments;
  }

  /**
   * Get single assignment details
   */
  async getAssignmentById(assignmentId, userId, userRole) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: parseInt(assignmentId) },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: {
              select: {
                name: true
              }
            }
          }
        },
        // Include submissions for teacher
        ...(userRole === 'TEACHER' && {
          submissions: {
            where: { isLatest: true },
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              submittedAt: 'desc'
            }
          }
        }),
        // Include student's submission if user is student
        ...(userRole === 'STUDENT' && {
          submissions: {
            where: {
              studentId: parseInt(userId)
            },
            orderBy: {
              version: 'desc'
            }
          }
        })
      }
    });

    if (!assignment) {
      throw new Error('Tugas tidak ditemukan');
    }

    // Verify user has access to this class
    await this.verifyClassAccess(assignment.classId, userId, userRole);

    // Students can only see published assignments
    if (userRole === 'STUDENT' && assignment.status !== 'PUBLISHED') {
      throw new Error('Tugas belum dipublikasi');
    }

    return assignment;
  }

  /**
   * Submit assignment (only for students)
   */
  async submitAssignment(assignmentId, studentId, submissionData, fileData = null) {
    const { content } = submissionData;

    // Check if assignment exists and is published
    const assignment = await prisma.assignment.findUnique({
      where: { id: parseInt(assignmentId) }
    });

    if (!assignment) {
      throw new Error('Tugas tidak ditemukan');
    }

    if (assignment.status !== 'PUBLISHED') {
      throw new Error('Tugas belum dipublikasi');
    }

    // Check if student is enrolled in the class
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: parseInt(studentId),
        classId: assignment.classId
      }
    });

    if (!enrollment) {
      throw new Error('Anda tidak terdaftar di kelas ini');
    }

    // Check for existing submissions
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        assignmentId: parseInt(assignmentId),
        studentId: parseInt(studentId),
        isLatest: true
      }
    });

    // Calculate lateness
    const now = new Date();
    const isLate = now > assignment.deadline;
    const lateByMinutes = isLate ? Math.floor((now - assignment.deadline) / (1000 * 60)) : null;

    let version = 1;
    let previousFileUrl = null;

    if (existingSubmission) {
      // Mark previous submission as not latest
      await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: { isLatest: false }
      });

      version = existingSubmission.version + 1;
      previousFileUrl = existingSubmission.fileUrl;
    }

    // Prepare submission data
    const submissionCreate = {
      assignmentId: parseInt(assignmentId),
      studentId: parseInt(studentId),
      version,
      content,
      isLatest: true,
      isLate,
      lateByMinutes,
      previousFileUrl,
      status: 'SUBMITTED'
    };

    // Add file data if exists
    if (fileData) {
      submissionCreate.fileUrl = fileData.fileUrl;
      submissionCreate.fileName = fileData.fileName;
      submissionCreate.fileSize = fileData.fileSize;
      submissionCreate.mimeType = fileData.mimeType;
    }

    const submission = await prisma.submission.create({
      data: submissionCreate,
      include: {
        assignment: {
          select: {
            title: true,
            deadline: true,
            maxScore: true
          }
        }
      }
    });

    // TODO: Schedule cleanup of previous file if exists
    if (previousFileUrl) {
      console.log('TODO: Schedule cleanup of previous file:', previousFileUrl);
    }

    return submission;
  }

  /**
   * Verify if user has access to a class
   */
  async verifyClassAccess(classId, userId, userRole) {
    if (userRole === 'TEACHER') {
      const teacherClass = await prisma.teacherClass.findFirst({
        where: {
          teacherId: parseInt(userId),
          classId: parseInt(classId)
        }
      });

      if (!teacherClass) {
        throw new Error('Anda tidak memiliki akses ke kelas ini');
      }
    } else if (userRole === 'STUDENT') {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: parseInt(userId),
          classId: parseInt(classId)
        }
      });

      if (!enrollment) {
        throw new Error('Anda tidak terdaftar di kelas ini');
      }
    }

    return true;
  }
// Tambahkan method ini di assignmentService.js

/**
 * Update assignment (only for teacher who created it)
 */
async updateAssignment(assignmentId, teacherId, updateData, fileData = null) {
  const { title, description, instruction, deadline, maxScore } = updateData;

  // Check if assignment exists and teacher owns it
  const assignment = await prisma.assignment.findUnique({
    where: { id: parseInt(assignmentId) }
  });

  if (!assignment) {
    throw new Error('Tugas tidak ditemukan');
  }

  if (assignment.teacherId !== parseInt(teacherId)) {
    throw new Error('Anda tidak memiliki akses untuk mengubah tugas ini');
  }

  // Prepare update data
  const updateFields = {
    ...(title && { title }),
    ...(description && { description }),
    ...(instruction && { instruction }),
    ...(deadline && { deadline: new Date(deadline) }),
    ...(maxScore && { maxScore: parseInt(maxScore) })
  };

  // Add file data if new file uploaded
  if (fileData) {
    updateFields.fileUrl = fileData.fileUrl;
    updateFields.fileName = fileData.fileName;
  }

  const updatedAssignment = await prisma.assignment.update({
    where: { id: parseInt(assignmentId) },
    data: updateFields,
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      class: {
        select: {
          id: true,
          name: true,
          subject: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  return updatedAssignment;
}

/**
 * Delete assignment (only for teacher who created it)
 */
async deleteAssignment(assignmentId, teacherId) {
  // Check if assignment exists and teacher owns it
  const assignment = await prisma.assignment.findUnique({
    where: { id: parseInt(assignmentId) }
  });

  if (!assignment) {
    throw new Error('Tugas tidak ditemukan');
  }

  if (assignment.teacherId !== parseInt(teacherId)) {
    throw new Error('Anda tidak memiliki akses untuk menghapus tugas ini');
  }

  // Delete assignment (will cascade delete submissions)
  await prisma.assignment.delete({
    where: { id: parseInt(assignmentId) }
  });

  // TODO: Delete files from storage
  if (assignment.fileUrl) {
    console.log('TODO: Delete assignment file from storage:', assignment.fileUrl);
  }

  return { message: 'Tugas berhasil dihapus' };
}

}

module.exports = new AssignmentService();