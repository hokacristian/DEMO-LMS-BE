const prisma = require('../configs/prisma');
const notificationService = require('./notificationService');

class MaterialService {
  /**
   * Create new material (only for TEACHER)
   */
  async createMaterial(teacherId, materialData, fileData = null) {
    const { title, description, content, classId } = materialData;

    // Verify teacher has access to this class
    const teacherClass = await prisma.teacherClass.findFirst({
      where: {
        teacherId: parseInt(teacherId),
        classId: parseInt(classId)
      }
    });

    if (!teacherClass) {
      throw new Error('Anda tidak memiliki akses untuk menambah materi di kelas ini');
    }

    // Prepare material data
    const materialCreate = {
      title,
      description,
      content,
      classId: parseInt(classId),
      teacherId: parseInt(teacherId)
    };

    // Add file data if exists
    if (fileData) {
      materialCreate.fileUrl = fileData.fileUrl;
      materialCreate.fileName = fileData.fileName;
      materialCreate.fileSize = fileData.fileSize;
      materialCreate.mimeType = fileData.mimeType;
    }

    // Create material
    const material = await prisma.material.create({
      data: materialCreate,
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
    await notificationService.createMaterialNotification(classId, material);

    return material;
  }

  /**
   * Get materials for a class
   */
  async getClassMaterials(classId, userId, userRole) {
    // Verify user has access to this class
    await this.verifyClassAccess(classId, userId, userRole);

    const materials = await prisma.material.findMany({
      where: { classId: parseInt(classId) },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return materials;
  }

  /**
   * Get single material details
   */
  async getMaterialById(materialId, userId, userRole) {
    const material = await prisma.material.findUnique({
      where: { id: parseInt(materialId) },
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

    if (!material) {
      throw new Error('Materi tidak ditemukan');
    }

    // Verify user has access to this class
    await this.verifyClassAccess(material.classId, userId, userRole);

    return material;
  }

  /**
   * Update material (only for teacher who created it)
   */
  async updateMaterial(materialId, teacherId, updateData, fileData = null) {
    const { title, description, content } = updateData;

    // Check if material exists and teacher owns it
    const material = await prisma.material.findUnique({
      where: { id: parseInt(materialId) }
    });

    if (!material) {
      throw new Error('Materi tidak ditemukan');
    }

    if (material.teacherId !== parseInt(teacherId)) {
      throw new Error('Anda tidak memiliki akses untuk mengubah materi ini');
    }

    // Prepare update data
    const updateFields = {
      ...(title && { title }),
      ...(description && { description }),
      ...(content && { content })
    };

    // Add file data if new file uploaded
    if (fileData) {
      updateFields.fileUrl = fileData.fileUrl;
      updateFields.fileName = fileData.fileName;
      updateFields.fileSize = fileData.fileSize;
      updateFields.mimeType = fileData.mimeType;
    }

    const updatedMaterial = await prisma.material.update({
      where: { id: parseInt(materialId) },
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

    return updatedMaterial;
  }

  /**
   * Delete material (only for teacher who created it)
   */
  async deleteMaterial(materialId, teacherId) {
    // Check if material exists and teacher owns it
    const material = await prisma.material.findUnique({
      where: { id: parseInt(materialId) }
    });

    if (!material) {
      throw new Error('Materi tidak ditemukan');
    }

    if (material.teacherId !== parseInt(teacherId)) {
      throw new Error('Anda tidak memiliki akses untuk menghapus materi ini');
    }

    // Delete material
    await prisma.material.delete({
      where: { id: parseInt(materialId) }
    });

    // TODO: Delete file from storage if exists
    if (material.fileUrl) {
      // Delete file from Supabase storage
      console.log('TODO: Delete file from storage:', material.fileUrl);
    }

    return { message: 'Materi berhasil dihapus' };
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

  /**
   * Get material statistics for teacher dashboard
   */
  async getMaterialStats(teacherId) {
    const stats = await prisma.material.groupBy({
      by: ['classId'],
      where: {
        teacherId: parseInt(teacherId)
      },
      _count: {
        id: true
      }
    });

    const totalMaterials = await prisma.material.count({
      where: {
        teacherId: parseInt(teacherId)
      }
    });

    return {
      totalMaterials,
      materialsPerClass: stats
    };
  }

  /**
   * Get all materials for logged-in student
   */
  async getAllMaterials(userId, userRole) {
    // If user is a teacher, get materials from classes they teach
    if (userRole === 'TEACHER') {
      const materials = await prisma.material.findMany({
        where: {
          teacherId: parseInt(userId)
        },
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return materials;
    }

    // If user is a student, get materials from classes they are enrolled in
    const materials = await prisma.material.findMany({
      where: {
        class: {
          students: {
            some: {
              studentId: parseInt(userId)
            }
          }
        }
      },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return materials;
  }
}

module.exports = new MaterialService();