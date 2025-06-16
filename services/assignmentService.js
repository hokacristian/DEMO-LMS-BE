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
   * Get all assignments from all student's classes
   */
  async getAllStudentAssignments(studentId, options = {}) {
    const {
      status = 'all', // 'all', 'submitted', 'pending', 'overdue'
      sortBy = 'deadline', // 'deadline', 'created', 'class'
      sortOrder = 'asc', // 'asc', 'desc'
      limit = null,
      offset = 0
    } = options;

    // Get all classes where student is enrolled
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: parseInt(studentId) },
      select: { classId: true }
    });

    const classIds = enrollments.map(enrollment => enrollment.classId);

    if (classIds.length === 0) {
      return [];
    }

    // Build where condition
    const whereCondition = {
      classId: { in: classIds },
      status: 'PUBLISHED' // Only published assignments
    };

    // Build include object
    const includeConfig = {
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
      submissions: {
        where: {
          studentId: parseInt(studentId),
          isLatest: true
        },
        select: {
          id: true,
          version: true,
          submittedAt: true,
          score: true,
          status: true,
          isLate: true,
          lateByMinutes: true,
          feedback: true
        }
      }
    };

    // Build orderBy
    let orderBy = {};
    switch (sortBy) {
      case 'created':
        orderBy = { createdAt: sortOrder };
        break;
      case 'class':
        orderBy = { class: { name: sortOrder } };
        break;
      case 'deadline':
      default:
        orderBy = { deadline: sortOrder };
        break;
    }

    // Build query options
    const queryOptions = {
      where: whereCondition,
      include: includeConfig,
      orderBy
    };

    if (limit) {
      queryOptions.take = parseInt(limit);
      queryOptions.skip = parseInt(offset);
    }

    // Get assignments
    let assignments = await prisma.assignment.findMany(queryOptions);

    // Filter by status if needed
    if (status !== 'all') {
      const now = new Date();
      
      assignments = assignments.filter(assignment => {
        const hasSubmission = assignment.submissions.length > 0;
        const isOverdue = now > assignment.deadline;
        
        switch (status) {
          case 'submitted':
            return hasSubmission;
          case 'pending':
            return !hasSubmission && !isOverdue;
          case 'overdue':
            return !hasSubmission && isOverdue;
          default:
            return true;
        }
      });
    }

    // Add computed fields
    const now = new Date();
    assignments = assignments.map(assignment => {
      const hasSubmission = assignment.submissions.length > 0;
      const submission = hasSubmission ? assignment.submissions[0] : null;
      const isOverdue = now > assignment.deadline;
      const daysUntilDeadline = Math.ceil((assignment.deadline - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...assignment,
        computed: {
          hasSubmission,
          isOverdue: !hasSubmission && isOverdue,
          daysUntilDeadline,
          submissionStatus: hasSubmission ? 'submitted' : (isOverdue ? 'overdue' : 'pending'),
          score: submission?.score || null,
          submittedAt: submission?.submittedAt || null,
          isLate: submission?.isLate || false,
          feedback: submission?.feedback || null
        }
      };
    });

    return assignments;
  }

  /**
   * Get all graded assignments for student
   */
  async getAllStudentGrades(studentId, options = {}) {
    const {
      sortBy = 'deadline', // 'grade', 'deadline', 'class', 'submitted'
      sortOrder = 'desc', // 'asc', 'desc'
      limit = null,
      offset = 0,
      classId = null
    } = options;

    // Get all classes where student is enrolled
    const enrollments = await prisma.enrollment.findMany({
      where: { 
        studentId: parseInt(studentId),
        ...(classId && { classId: parseInt(classId) })
      },
      select: { classId: true }
    });

    const classIds = enrollments.map(enrollment => enrollment.classId);

    if (classIds.length === 0) {
      return { grades: [], total: 0 };
    }

    // Build where condition
    const whereCondition = {
      studentId: parseInt(studentId),
      isLatest: true,
      score: { not: null }, // Only graded submissions
      assignment: {
        classId: { in: classIds },
        status: 'PUBLISHED'
      }
    };

    // Build include object
    const includeConfig = {
      assignment: {
        select: {
          id: true,
          title: true,
          description: true,
          deadline: true,
          maxScore: true,
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
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    };

    // Build orderBy
    let orderBy = {};
    switch (sortBy) {
      case 'grade':
        orderBy = { score: sortOrder };
        break;
      case 'class':
        orderBy = { assignment: { class: { name: sortOrder } } };
        break;
      case 'submitted':
        orderBy = { submittedAt: sortOrder };
        break;
      case 'deadline':
      default:
        orderBy = { assignment: { deadline: sortOrder } };
        break;
    }

    // Get total count first
    const totalCount = await prisma.submission.count({
      where: whereCondition
    });

    // Build query options
    const queryOptions = {
      where: whereCondition,
      include: includeConfig,
      orderBy
    };

    if (limit) {
      queryOptions.take = parseInt(limit);
      queryOptions.skip = parseInt(offset);
    }

    // Get graded submissions
    const submissions = await prisma.submission.findMany(queryOptions);

    // Format the response
    const grades = submissions.map(submission => {
      const percentage = (submission.score / submission.assignment.maxScore) * 100;
      
      return {
        id: submission.id,
        score: submission.score,
        maxScore: submission.assignment.maxScore,
        percentage: Math.round(percentage * 100) / 100,
        feedback: submission.feedback,
        submittedAt: submission.submittedAt,
        gradedAt: submission.gradedAt,
        isLate: submission.isLate,
        lateByMinutes: submission.lateByMinutes,
        assignment: {
          id: submission.assignment.id,
          title: submission.assignment.title,
          description: submission.assignment.description,
          deadline: submission.assignment.deadline,
          class: submission.assignment.class,
          teacher: submission.assignment.teacher
        }
      };
    });

    return {
      grades,
      total: totalCount
    };
  }

  /**
   * 🆕 NEW FEATURE: Get assignment grades for a specific class
   * Method untuk mendapatkan nilai tugas di kelas tertentu
   */
  async getClassGrades(classId, studentId) {
    // Verify student has access to this class
    await this.verifyClassAccess(classId, studentId, 'STUDENT');

    // Get class info
    const classInfo = await prisma.class.findUnique({
      where: { id: parseInt(classId) },
      select: {
        id: true,
        name: true,
        subject: {
          select: {
            name: true
          }
        }
      }
    });

    if (!classInfo) {
      throw new Error('Kelas tidak ditemukan');
    }

    // Get all published assignments in this class
    const assignments = await prisma.assignment.findMany({
      where: {
        classId: parseInt(classId),
        status: 'PUBLISHED'
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        submissions: {
          where: {
            studentId: parseInt(studentId),
            isLatest: true
          },
          select: {
            id: true,
            score: true,
            feedback: true,
            submittedAt: true,
            gradedAt: true,
            isLate: true,
            lateByMinutes: true,
            status: true
          }
        }
      },
      orderBy: {
        deadline: 'asc'
      }
    });

    const now = new Date();
    
    // Format assignments with grade information
    const assignmentGrades = assignments.map(assignment => {
      const submission = assignment.submissions.length > 0 ? assignment.submissions[0] : null;
      const hasSubmission = !!submission;
      const isGraded = submission && submission.score !== null;
      const isOverdue = now > assignment.deadline;
      
      let status = 'not_submitted';
      if (hasSubmission && isGraded) {
        status = 'graded';
      } else if (hasSubmission && !isGraded) {
        status = 'submitted_not_graded';
      } else if (!hasSubmission && isOverdue) {
        status = 'overdue';
      } else if (!hasSubmission && !isOverdue) {
        status = 'pending';
      }

      const result = {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          deadline: assignment.deadline,
          maxScore: assignment.maxScore,
          teacher: assignment.teacher
        },
        submission: {
          hasSubmission,
          isGraded,
          submittedAt: submission?.submittedAt || null,
          gradedAt: submission?.gradedAt || null,
          isLate: submission?.isLate || false,
          lateByMinutes: submission?.lateByMinutes || null
        },
        grade: {
          score: submission?.score || null,
          maxScore: assignment.maxScore,
          percentage: isGraded ? Math.round((submission.score / assignment.maxScore) * 100 * 100) / 100 : null,
          feedback: submission?.feedback || null
        },
        status,
        computed: {
          isOverdue: !hasSubmission && isOverdue,
          daysUntilDeadline: Math.ceil((assignment.deadline - now) / (1000 * 60 * 60 * 24))
        }
      };

      return result;
    });

    // Calculate statistics
    const gradedAssignments = assignmentGrades.filter(ag => ag.grade.score !== null);
    const totalAssignments = assignments.length;
    const totalGraded = gradedAssignments.length;
    const totalPending = assignments.length - totalGraded;
    
    let averageScore = 0;
    let averagePercentage = 0;
    let highestScore = 0;
    let lowestScore = 0;

    if (gradedAssignments.length > 0) {
      const scores = gradedAssignments.map(ag => ag.grade.score);
      const percentages = gradedAssignments.map(ag => ag.grade.percentage);
      
      averageScore = Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
      averagePercentage = Math.round((percentages.reduce((sum, percentage) => sum + percentage, 0) / percentages.length) * 100) / 100;
      highestScore = Math.max(...scores);
      lowestScore = Math.min(...scores);
    }

    const statistics = {
      totalAssignments,
      totalGraded,
      totalPending,
      averageScore,
      averagePercentage,
      highestScore,
      lowestScore
    };

    return {
      class: classInfo,
      assignments: assignmentGrades,
      statistics
    };
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

    // Build include object based on user role
    const includeConfig = {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    };

    // Add _count for teachers only
    if (userRole === 'TEACHER') {
      includeConfig._count = {
        select: {
          submissions: true
        }
      };
    }

    // Add student's submissions if user is student
    if (userRole === 'STUDENT') {
      includeConfig.submissions = {
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
      };
    }

    const assignments = await prisma.assignment.findMany({
      where: whereCondition,
      include: includeConfig,
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
    // Build include object based on user role
    const includeConfig = {
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
    };

    // Include submissions for teacher
    if (userRole === 'TEACHER') {
      includeConfig.submissions = {
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
      };
    }

    // Include student's submission if user is student
    if (userRole === 'STUDENT') {
      includeConfig.submissions = {
        where: {
          studentId: parseInt(userId)
        },
        orderBy: {
          version: 'desc'
        }
      };
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: parseInt(assignmentId) },
      include: includeConfig
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

    // Schedule cleanup of previous file if exists
    if (previousFileUrl) {
      // TODO: Implement file cleanup from Supabase storage
      console.log('TODO: Schedule cleanup of previous file:', previousFileUrl);
    }

    return submission;
  }

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
      
      // TODO: Delete old file if exists
      if (assignment.fileUrl) {
        console.log('TODO: Delete old assignment file:', assignment.fileUrl);
      }
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
}

module.exports = new AssignmentService();