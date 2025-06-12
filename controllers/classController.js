const Joi = require('joi');
const classService = require('../services/classService');
const prisma = require('../configs/prisma'); // Tambahkan import ini

// Validation schemas (sama seperti sebelumnya)
const createClassSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Nama kelas minimal 2 karakter',
    'string.max': 'Nama kelas maksimal 100 karakter',
    'any.required': 'Nama kelas wajib diisi'
  }),
  description: Joi.string().max(500).messages({
    'string.max': 'Deskripsi maksimal 500 karakter'
  }),
  subjectId: Joi.number().integer().positive().required().messages({
    'number.positive': 'Subject ID harus berupa angka positif',
    'any.required': 'Subject ID wajib diisi'
  }),
  academicPeriodId: Joi.number().integer().positive().required().messages({
    'number.positive': 'Academic Period ID harus berupa angka positif',
    'any.required': 'Academic Period ID wajib diisi'
  })
});

const enrollSchema = Joi.object({
  enrollCode: Joi.string().length(6).uppercase().required().messages({
    'string.length': 'Kode kelas harus 6 karakter',
    'any.required': 'Kode kelas wajib diisi'
  })
});

class ClassController {
  /**
   * Create new class (TEACHER & ADMIN only)
   */
  async createClass(req, res) {
    try {
      // Only TEACHER and ADMIN can create classes
      if (!['TEACHER', 'ADMIN'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru dan admin yang dapat membuat kelas'
        });
      }

      // Validate request body
      const { error, value } = createClassSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Create class
      const newClass = await classService.createClass(req.user.id, value);

      res.status(201).json({
        success: true,
        message: 'Kelas berhasil dibuat',
        data: { class: newClass }
      });
    } catch (error) {
      console.error('Create class error:', error.message);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Gagal membuat kelas'
      });
    }
  }

  /**
   * Get user's classes (different view for teacher vs student)
   */
  async getUserClasses(req, res) {
    try {
      let classes;

      if (req.user.role === 'TEACHER') {
        classes = await classService.getTeacherClasses(req.user.id);
      } else if (req.user.role === 'STUDENT') {
        classes = await classService.getStudentClasses(req.user.id);
      } else {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak'
        });
      }

      res.json({
        success: true,
        message: 'Daftar kelas berhasil diambil',
        data: { classes }
      });
    } catch (error) {
      console.error('Get user classes error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil daftar kelas'
      });
    }
  }

  /**
   * Enroll student to class using enrollment code
   */
  async enrollStudent(req, res) {
    try {
      // Only students can enroll
      if (req.user.role !== 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Hanya siswa yang dapat mendaftar ke kelas'
        });
      }

      // Validate request body
      const { error, value } = enrollSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Enroll student
      const result = await classService.enrollStudent(req.user.id, value.enrollCode);

      res.status(201).json({
        success: true,
        message: 'Berhasil mendaftar ke kelas',
        data: result
      });
    } catch (error) {
      console.error('Enroll student error:', error.message);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Gagal mendaftar ke kelas'
      });
    }
  }

  /**
   * Get class details with students/materials info
   */
  async getClassDetails(req, res) {
    try {
      const { classId } = req.params;

      const classData = await classService.getClassDetails(
        classId, 
        req.user.id, 
        req.user.role
      );

      res.json({
        success: true,
        message: 'Detail kelas berhasil diambil',
        data: { class: classData }
      });
    } catch (error) {
      console.error('Get class details error:', error.message);
      
      const statusCode = error.message.includes('tidak memiliki akses') || 
                        error.message.includes('tidak terdaftar') ? 403 : 404;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengambil detail kelas'
      });
    }
  }

  /**
   * Get class students (for teachers)
   */
  async getClassStudents(req, res) {
    try {
      const { classId } = req.params;

      // Only teachers can view class students
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat melihat daftar siswa'
        });
      }

      // Verify teacher has access to this class
      const classDetails = await classService.getClassDetails(
        classId, 
        req.user.id, 
        req.user.role
      );

      const students = await classService.getClassStudents(classId);

      res.json({
        success: true,
        message: 'Daftar siswa berhasil diambil',
        data: { 
          class: {
            id: classDetails.id,
            name: classDetails.name
          },
          students 
        }
      });
    } catch (error) {
      console.error('Get class students error:', error.message);
      
      const statusCode = error.message.includes('tidak memiliki akses') ? 403 : 404;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengambil daftar siswa'
      });
    }
  }

  /**
   * Leave class (for students)
   */
  async leaveClass(req, res) {
    try {
      const { classId } = req.params;

      // Only students can leave class
      if (req.user.role !== 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Hanya siswa yang dapat keluar dari kelas'
        });
      }

      // Check if student is enrolled
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: parseInt(req.user.id),
          classId: parseInt(classId)
        }
      });

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Anda tidak terdaftar di kelas ini'
        });
      }

      // Remove enrollment
      await prisma.enrollment.delete({
        where: { id: enrollment.id }
      });

      res.json({
        success: true,
        message: 'Berhasil keluar dari kelas'
      });
    } catch (error) {
      console.error('Leave class error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal keluar dari kelas'
      });
    }
  }

  /**
   * Update class (for teachers who own the class) - INI YANG MISSING!
   */
  async updateClass(req, res) {
    try {
      const { classId } = req.params;

      // Only teachers can update class
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat mengubah kelas'
        });
      }

      // Validate update data (partial validation)
      const updateSchema = Joi.object({
        name: Joi.string().min(2).max(100),
        description: Joi.string().max(500).allow('', null)
      }).min(1);

      const { error, value } = updateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Check if teacher has access to this class
      await classService.getClassDetails(classId, req.user.id, req.user.role);

      // Update class
      const updatedClass = await prisma.class.update({
        where: { id: parseInt(classId) },
        data: value,
        include: {
          subject: true,
          academicPeriod: true
        }
      });

      res.json({
        success: true,
        message: 'Kelas berhasil diupdate',
        data: { class: updatedClass }
      });
    } catch (error) {
      console.error('Update class error:', error.message);
      
      const statusCode = error.message.includes('tidak memiliki akses') ? 403 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengupdate kelas'
      });
    }
  }
}

module.exports = new ClassController();