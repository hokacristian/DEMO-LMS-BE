const prisma = require('../configs/prisma');

class ClassService {
  /**
   * Create new class (hanya untuk TEACHER dan ADMIN)
   */
  async createClass(teacherId, classData) {
    const { name, description, subjectId, academicPeriodId } = classData;

    // Generate unique enrollment code
    const enrollCode = this.generateEnrollCode();

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        enrollCode,
        subjectId: parseInt(subjectId),
        academicPeriodId: parseInt(academicPeriodId)
      },
      include: {
        subject: true,
        academicPeriod: true
      }
    });

    // Assign teacher to class
    await prisma.teacherClass.create({
      data: {
        teacherId: parseInt(teacherId),
        classId: newClass.id
      }
    });

    return newClass;
  }

  /**
   * Get classes for teacher
   */
  async getTeacherClasses(teacherId) {
    const classes = await prisma.teacherClass.findMany({
      where: { teacherId: parseInt(teacherId) },
      include: {
        class: {
          include: {
            subject: true,
            academicPeriod: true,
            _count: {
              select: {
                students: true,
                materials: true,
                assignments: true
              }
            }
          }
        }
      }
    });

    return classes.map(tc => tc.class);
  }

  /**
   * Get classes for student
   */
  async getStudentClasses(studentId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: parseInt(studentId) },
      include: {
        class: {
          include: {
            subject: true,
            academicPeriod: true,
            teachers: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            },
            _count: {
              select: {
                materials: true,
                assignments: true
              }
            }
          }
        }
      }
    });

    return enrollments.map(enrollment => enrollment.class);
  }

  /**
   * Enroll student to class using enrollment code
   */
  async enrollStudent(studentId, enrollCode) {
    // Find class by enrollment code
    const classData = await prisma.class.findUnique({
      where: { enrollCode },
      include: {
        subject: true,
        academicPeriod: true
      }
    });

    if (!classData) {
      throw new Error('Kode kelas tidak valid');
    }

    // Check if student already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: parseInt(studentId),
          classId: classData.id
        }
      }
    });

    if (existingEnrollment) {
      throw new Error('Anda sudah terdaftar di kelas ini');
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: parseInt(studentId),
        classId: classData.id
      }
    });

    return {
      enrollment,
      class: classData
    };
  }

  /**
   * Get class details with students (for teacher)
   */
  async getClassDetails(classId, userId, userRole) {
    // Check if user has access to this class
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

    const classData = await prisma.class.findUnique({
      where: { id: parseInt(classId) },
      include: {
        subject: true,
        academicPeriod: true,
        teachers: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            materials: true,
            assignments: true,
            quizzes: true
          }
        }
      }
    });

    return classData;
  }

  /**
   * Generate unique enrollment code
   */
  generateEnrollCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get class students (for notifications)
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
}

module.exports = new ClassService();