const Joi = require('joi');
const assignmentService = require('../services/assignmentService');
const prisma = require('../configs/prisma');
const uploadService = require('../services/uploadService');

// Validation schemas
const createAssignmentSchema = Joi.object({
  title: Joi.string().min(2).max(200).required().messages({
    'string.min': 'Judul tugas minimal 2 karakter',
    'string.max': 'Judul tugas maksimal 200 karakter',
    'any.required': 'Judul tugas wajib diisi'
  }),
  description: Joi.string().min(10).max(2000).required().messages({
    'string.min': 'Deskripsi minimal 10 karakter',
    'string.max': 'Deskripsi maksimal 2000 karakter',
    'any.required': 'Deskripsi wajib diisi'
  }),
  instruction: Joi.string().max(5000).messages({
    'string.max': 'Instruksi maksimal 5000 karakter'
  }),
  deadline: Joi.date().greater('now').required().messages({
    'date.greater': 'Deadline harus di masa depan',
    'any.required': 'Deadline wajib diisi'
  }),
  maxScore: Joi.number().integer().min(1).max(1000).messages({
    'number.min': 'Nilai maksimal minimal 1',
    'number.max': 'Nilai maksimal maksimal 1000'
  }),
  classId: Joi.number().integer().positive().required().messages({
    'number.positive': 'Class ID harus berupa angka positif',
    'any.required': 'Class ID wajib diisi'
  })
});

const updateAssignmentSchema = Joi.object({
  title: Joi.string().min(2).max(200).messages({
    'string.min': 'Judul tugas minimal 2 karakter',
    'string.max': 'Judul tugas maksimal 200 karakter'
  }),
  description: Joi.string().min(10).max(2000).messages({
    'string.min': 'Deskripsi minimal 10 karakter',
    'string.max': 'Deskripsi maksimal 2000 karakter'
  }),
  instruction: Joi.string().max(5000).allow('', null).messages({
    'string.max': 'Instruksi maksimal 5000 karakter'
  }),
  deadline: Joi.date().greater('now').messages({
    'date.greater': 'Deadline harus di masa depan'
  }),
  maxScore: Joi.number().integer().min(1).max(1000).messages({
    'number.min': 'Nilai maksimal minimal 1',
    'number.max': 'Nilai maksimal maksimal 1000'
  })
}).min(1).messages({
  'object.min': 'Minimal satu field harus diisi'
});

const submitAssignmentSchema = Joi.object({
  content: Joi.string().max(10000).messages({
    'string.max': 'Konten submission maksimal 10000 karakter'
  })
});

const getAllStudentAssignmentsSchema = Joi.object({
  status: Joi.string().valid('all', 'submitted', 'pending', 'overdue').default('all'),
  sortBy: Joi.string().valid('deadline', 'created', 'class').default('deadline'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  limit: Joi.number().integer().min(1).max(100),
  page: Joi.number().integer().min(1).default(1)
});

const getAllStudentGradesSchema = Joi.object({
  sortBy: Joi.string().valid('grade', 'deadline', 'class', 'submitted').default('deadline'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  limit: Joi.number().integer().min(1).max(100),
  page: Joi.number().integer().min(1).default(1),
  classId: Joi.number().integer().positive().optional().messages({
    'number.positive': 'Class ID harus berupa angka positif'
  })
});

class AssignmentController {
  /**
   * Create new assignment (TEACHER only)
   */
  async createAssignment(req, res) {
    try {
      // Only teachers can create assignments
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat membuat tugas'
        });
      }

      // Validate request body
      const { error, value } = createAssignmentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Handle file upload if exists
      let fileData = null;
      if (req.file) {
        try {
          fileData = await uploadService.uploadAssignmentAttachment(
            req.file,
            value.classId,
            req.user.id
          );
          
          console.log('✅ Assignment file uploaded:', fileData.fileUrl);
        } catch (uploadError) {
          console.error('❌ File upload failed:', uploadError);
          return res.status(400).json({
            success: false,
            message: 'Gagal mengupload file: ' + uploadError.message
          });
        }
      }

      // Create assignment
      const assignment = await assignmentService.createAssignment(req.user.id, value, fileData);

      res.status(201).json({
        success: true,
        message: 'Tugas berhasil dibuat (status: DRAFT)',
        data: { assignment }
      });
    } catch (error) {
      console.error('Create assignment error:', error.message);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Gagal membuat tugas'
      });
    }
  }

  /**
   * Publish assignment (change from DRAFT to PUBLISHED)
   */
  async publishAssignment(req, res) {
    try {
      const { assignmentId } = req.params;

      // Only teachers can publish assignments
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat mempublikasi tugas'
        });
      }

      const publishedAssignment = await assignmentService.publishAssignment(
        assignmentId,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Tugas berhasil dipublikasi dan notifikasi telah dikirim ke siswa',
        data: { assignment: publishedAssignment }
      });
    } catch (error) {
      console.error('Publish assignment error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') ? 404 :
                        error.message.includes('tidak memiliki akses') ? 403 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mempublikasi tugas'
      });
    }
  }

  /**
   * Get all assignments from all student's classes
   */
  async getAllStudentAssignments(req, res) {
    try {
      // Only students can use this endpoint
      if (req.user.role !== 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Endpoint ini hanya untuk siswa'
        });
      }

      // Validate query parameters
      const { error, value } = getAllStudentAssignmentsSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Parameter tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      const { status, sortBy, sortOrder, limit, page } = value;
      
      // Calculate offset for pagination
      const offset = limit ? (page - 1) * limit : 0;

      // Get assignments
      const assignments = await assignmentService.getAllStudentAssignments(
        req.user.id,
        {
          status,
          sortBy,
          sortOrder,
          limit,
          offset
        }
      );

      // Calculate pagination info
      const totalAssignments = assignments.length;
      const hasMore = limit ? totalAssignments === limit : false;

      // Group assignments by status for summary
      const summary = {
        total: totalAssignments,
        submitted: assignments.filter(a => a.computed.submissionStatus === 'submitted').length,
        pending: assignments.filter(a => a.computed.submissionStatus === 'pending').length,
        overdue: assignments.filter(a => a.computed.submissionStatus === 'overdue').length,
        graded: assignments.filter(a => a.computed.score !== null).length
      };

      res.json({
        success: true,
        message: 'Semua tugas berhasil diambil',
        data: {
          assignments,
          summary,
          filters: {
            status,
            sortBy,
            sortOrder
          },
          pagination: limit ? {
            page,
            limit,
            total: totalAssignments,
            hasMore
          } : null
        }
      });
    } catch (error) {
      console.error('Get all student assignments error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil semua tugas'
      });
    }
  }

  /**
   * Get all graded assignments for student
   */
  async getAllStudentGrades(req, res) {
    try {
      // Only students can use this endpoint
      if (req.user.role !== 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Endpoint ini hanya untuk siswa'
        });
      }

      // Validate query parameters
      const { error, value } = getAllStudentGradesSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Parameter tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      const { sortBy, sortOrder, limit, page, classId } = value;
      
      // Calculate offset for pagination
      const offset = limit ? (page - 1) * limit : 0;

      // Get graded assignments
      const grades = await assignmentService.getAllStudentGrades(
        req.user.id,
        {
          sortBy,
          sortOrder,
          limit,
          offset,
          classId
        }
      );

      // Calculate statistics
      const gradeStats = calculateGradeStats(grades.grades);

      res.json({
        success: true,
        message: 'Daftar nilai berhasil diambil',
        data: {
          grades: grades.grades,
          statistics: gradeStats,
          filters: {
            sortBy,
            sortOrder,
            classId: classId || 'all'
          },
          pagination: limit ? {
            page,
            limit,
            total: grades.total,
            hasMore: grades.grades.length === limit
          } : null
        }
      });
    } catch (error) {
      console.error('Get all student grades error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil daftar nilai'
      });
    }
  }

  /**
   * 🆕 NEW FEATURE: Get assignment grades for a specific class
   * Endpoint untuk melihat nilai tugas di kelas tertentu
   */
  async getClassGrades(req, res) {
    try {
      const { classId } = req.params;

      // Only students can use this endpoint
      if (req.user.role !== 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Endpoint ini hanya untuk siswa'
        });
      }

      // Validate classId parameter
      if (!classId || isNaN(parseInt(classId))) {
        return res.status(400).json({
          success: false,
          message: 'Class ID tidak valid'
        });
      }

      // Get class grades
      const result = await assignmentService.getClassGrades(classId, req.user.id);

      res.json({
        success: true,
        message: 'Nilai tugas kelas berhasil diambil',
        data: result
      });
    } catch (error) {
      console.error('Get class grades error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') ? 404 :
                        (error.message.includes('tidak memiliki akses') || 
                         error.message.includes('tidak terdaftar')) ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengambil nilai tugas kelas'
      });
    }
  }

  /**
   * Get assignments for a class
   */
  async getClassAssignments(req, res) {
    try {
      const { classId } = req.params;

      const assignments = await assignmentService.getClassAssignments(
        classId,
        req.user.id,
        req.user.role
      );

      res.json({
        success: true,
        message: 'Daftar tugas berhasil diambil',
        data: { assignments }
      });
    } catch (error) {
      console.error('Get class assignments error:', error.message);
      
      const statusCode = error.message.includes('tidak memiliki akses') || 
                        error.message.includes('tidak terdaftar') ? 403 : 404;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengambil daftar tugas'
      });
    }
  }

  /**
   * Get single assignment details
   */
  async getAssignmentById(req, res) {
    try {
      const { assignmentId } = req.params;

      const assignment = await assignmentService.getAssignmentById(
        assignmentId,
        req.user.id,
        req.user.role
      );

      res.json({
        success: true,
        message: 'Detail tugas berhasil diambil',
        data: { assignment }
      });
    } catch (error) {
      console.error('Get assignment by ID error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') || 
                        error.message.includes('belum dipublikasi') ? 404 :
                        (error.message.includes('tidak memiliki akses') || 
                         error.message.includes('tidak terdaftar')) ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengambil detail tugas'
      });
    }
  }

  /**
   * Update assignment (only for teacher who created it)
   */
  async updateAssignment(req, res) {
    try {
      const { assignmentId } = req.params;

      // Only teachers can update assignments
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat mengubah tugas'
        });
      }

      // Validate request body
      const { error, value } = updateAssignmentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Handle new file upload if exists
      let fileData = null;
      if (req.file) {
        try {
          fileData = await uploadService.uploadAssignmentAttachment(
            req.file,
            null, // We'll get classId from existing assignment
            req.user.id
          );
          
          console.log('✅ Updated assignment file uploaded:', fileData.fileUrl);
        } catch (uploadError) {
          console.error('❌ File upload failed:', uploadError);
          return res.status(400).json({
            success: false,
            message: 'Gagal mengupload file: ' + uploadError.message
          });
        }
      }

      // Update assignment
      const updatedAssignment = await assignmentService.updateAssignment(
        assignmentId,
        req.user.id,
        value,
        fileData
      );

      res.json({
        success: true,
        message: 'Tugas berhasil diupdate',
        data: { assignment: updatedAssignment }
      });
    } catch (error) {
      console.error('Update assignment error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') ? 404 :
                        error.message.includes('tidak memiliki akses') ? 403 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengupdate tugas'
      });
    }
  }

  /**
   * Delete assignment (only for teacher who created it)
   */
  async deleteAssignment(req, res) {
    try {
      const { assignmentId } = req.params;

      // Only teachers can delete assignments
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat menghapus tugas'
        });
      }

      const result = await assignmentService.deleteAssignment(assignmentId, req.user.id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete assignment error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') ? 404 :
                        error.message.includes('tidak memiliki akses') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal menghapus tugas'
      });
    }
  }

  /**
   * Submit assignment (STUDENT only)
   */
  async submitAssignment(req, res) {
    try {
      const { assignmentId } = req.params;

      // Only students can submit assignments
      if (req.user.role !== 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Hanya siswa yang dapat mengumpulkan tugas'
        });
      }

      // Validate request body
      const { error, value } = submitAssignmentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Handle file upload if exists
      let fileData = null;
      if (req.file) {
        try {
          fileData = await uploadService.uploadSubmission(
            req.file,
            assignmentId,
            req.user.id
          );
          
          console.log('✅ Submission file uploaded:', fileData.fileUrl);
        } catch (uploadError) {
          console.error('❌ File upload failed:', uploadError);
          return res.status(400).json({
            success: false,
            message: 'Gagal mengupload file: ' + uploadError.message
          });
        }
      }

      // Submit assignment
      const submission = await assignmentService.submitAssignment(
        assignmentId,
        req.user.id,
        value,
        fileData
      );

      res.status(201).json({
        success: true,
        message: submission.isLate 
          ? `Tugas berhasil dikumpulkan (terlambat ${submission.lateByMinutes} menit)`
          : 'Tugas berhasil dikumpulkan',
        data: { submission }
      });
    } catch (error) {
      console.error('Submit assignment error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') ||
                        error.message.includes('belum dipublikasi') ? 404 :
                        error.message.includes('tidak terdaftar') ? 403 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengumpulkan tugas'
      });
    }
  }

  /**
   * Get assignment submissions (for teachers)
   */
  async getAssignmentSubmissions(req, res) {
    try {
      const { assignmentId } = req.params;

      // Only teachers can view submissions
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat melihat daftar submission'
        });
      }

      // Get assignment with submissions
      const assignment = await assignmentService.getAssignmentById(
        assignmentId,
        req.user.id,
        req.user.role
      );

      res.json({
        success: true,
        message: 'Daftar submission berhasil diambil',
        data: {
          assignment: {
            id: assignment.id,
            title: assignment.title,
            deadline: assignment.deadline,
            maxScore: assignment.maxScore
          },
          submissions: assignment.submissions || []
        }
      });
    } catch (error) {
      console.error('Get assignment submissions error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') ? 404 :
                        error.message.includes('tidak memiliki akses') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengambil daftar submission'
      });
    }
  }

  /**
   * Grade submission (for teachers)
   */
  async gradeSubmission(req, res) {
    try {
      const { submissionId } = req.params;

      // Only teachers can grade submissions
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat menilai submission'
        });
      }

      // Validate grade data
      const gradeSchema = Joi.object({
        score: Joi.number().integer().min(0).required().messages({
          'number.min': 'Nilai tidak boleh negatif',
          'any.required': 'Nilai wajib diisi'
        }),
        feedback: Joi.string().max(2000).messages({
          'string.max': 'Feedback maksimal 2000 karakter'
        })
      });

      const { error, value } = gradeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Update submission with grade
      const updatedSubmission = await prisma.submission.update({
        where: { id: parseInt(submissionId) },
        data: {
          score: value.score,
          feedback: value.feedback,
          status: 'GRADED',
          gradedAt: new Date()
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assignment: {
            select: {
              title: true,
              maxScore: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Submission berhasil dinilai',
        data: { submission: updatedSubmission }
      });
    } catch (error) {
      console.error('Grade submission error:', error.message);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Gagal menilai submission'
      });
    }
  }

}

/**
 * Calculate grade statistics (helper function)
 */
function calculateGradeStats(grades) {
  if (grades.length === 0) {
    return {
      totalAssignments: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      averagePercentage: 0
    };
  }

  const scores = grades.map(grade => grade.score);
  const percentages = grades.map(grade => (grade.score / grade.maxScore) * 100);
  
  const totalAssignments = grades.length;
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalAssignments;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const averagePercentage = percentages.reduce((sum, percentage) => sum + percentage, 0) / totalAssignments;

  return {
    totalAssignments,
    averageScore: Math.round(averageScore * 100) / 100,
    highestScore,
    lowestScore,
    averagePercentage: Math.round(averagePercentage * 100) / 100
  };
}

module.exports = new AssignmentController();