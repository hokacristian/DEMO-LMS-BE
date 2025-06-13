const Joi = require('joi');
const materialService = require('../services/materialService');
const uploadService = require('../services/uploadService');


// Validation schemas
const createMaterialSchema = Joi.object({
  title: Joi.string().min(2).max(200).required().messages({
    'string.min': 'Judul materi minimal 2 karakter',
    'string.max': 'Judul materi maksimal 200 karakter',
    'any.required': 'Judul materi wajib diisi'
  }),
  description: Joi.string().max(1000).messages({
    'string.max': 'Deskripsi maksimal 1000 karakter'
  }),
  content: Joi.string().max(10000).messages({
    'string.max': 'Konten maksimal 10000 karakter'
  }),
  classId: Joi.number().integer().positive().required().messages({
    'number.positive': 'Class ID harus berupa angka positif',
    'any.required': 'Class ID wajib diisi'
  })
});

const updateMaterialSchema = Joi.object({
  title: Joi.string().min(2).max(200).messages({
    'string.min': 'Judul materi minimal 2 karakter',
    'string.max': 'Judul materi maksimal 200 karakter'
  }),
  description: Joi.string().max(1000).allow('', null).messages({
    'string.max': 'Deskripsi maksimal 1000 karakter'
  }),
  content: Joi.string().max(10000).allow('', null).messages({
    'string.max': 'Konten maksimal 10000 karakter'
  })
}).min(1).messages({
  'object.min': 'Minimal satu field harus diisi'
});

class MaterialController {
  /**
   * Create new material (TEACHER only)
   */
  async createMaterial(req, res) {
    try {
      // Only teachers can create materials
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat membuat materi'
        });
      }

      // Validate request body
      const { error, value } = createMaterialSchema.validate(req.body);
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
          // ACTUAL UPLOAD TO SUPABASE!
          fileData = await uploadService.uploadMaterial(
            req.file,
            value.classId,
            req.user.id
          );
          
          console.log('✅ Material file uploaded:', fileData.fileUrl);
        } catch (uploadError) {
          console.error('❌ File upload failed:', uploadError);
          return res.status(400).json({
            success: false,
            message: 'Gagal mengupload file: ' + uploadError.message
          });
        }
      }

      // Create material
      const material = await materialService.createMaterial(req.user.id, value, fileData);

      res.status(201).json({
        success: true,
        message: 'Materi berhasil ditambahkan',
        data: { material }
      });
    } catch (error) {
      console.error('Create material error:', error.message);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Gagal membuat materi'
      });
    }
  }

  /**
   * Get materials for a class
   */
  async getClassMaterials(req, res) {
    try {
      const { classId } = req.params;

      const materials = await materialService.getClassMaterials(
        classId,
        req.user.id,
        req.user.role
      );

      res.json({
        success: true,
        message: 'Daftar materi berhasil diambil',
        data: { materials }
      });
    } catch (error) {
      console.error('Get class materials error:', error.message);
      
      const statusCode = error.message.includes('tidak memiliki akses') || 
                        error.message.includes('tidak terdaftar') ? 403 : 404;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengambil daftar materi'
      });
    }
  }

  /**
   * Get single material details
   */
  async getMaterialById(req, res) {
    try {
      const { materialId } = req.params;

      const material = await materialService.getMaterialById(
        materialId,
        req.user.id,
        req.user.role
      );

      res.json({
        success: true,
        message: 'Detail materi berhasil diambil',
        data: { material }
      });
    } catch (error) {
      console.error('Get material by ID error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') ? 404 :
                        (error.message.includes('tidak memiliki akses') || 
                         error.message.includes('tidak terdaftar')) ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengambil detail materi'
      });
    }
  }

  /**
   * Update material (only for teacher who created it)
   */
  async updateMaterial(req, res) {
    try {
      const { materialId } = req.params;

      // Only teachers can update materials
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat mengubah materi'
        });
      }

      // Validate request body
      const { error, value } = updateMaterialSchema.validate(req.body);
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
          // ACTUAL UPLOAD TO SUPABASE!
          fileData = await uploadService.uploadMaterial(
            req.file,
            null, // We'll get classId from existing material
            req.user.id
          );
          
          console.log('✅ Updated material file uploaded:', fileData.fileUrl);
        } catch (uploadError) {
          console.error('❌ File upload failed:', uploadError);
          return res.status(400).json({
            success: false,
            message: 'Gagal mengupload file: ' + uploadError.message
          });
        }
      }

      // Update material
      const updatedMaterial = await materialService.updateMaterial(
        materialId,
        req.user.id,
        value,
        fileData
      );

      res.json({
        success: true,
        message: 'Materi berhasil diupdate',
        data: { material: updatedMaterial }
      });
    } catch (error) {
      console.error('Update material error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') ? 404 :
                        error.message.includes('tidak memiliki akses') ? 403 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengupdate materi'
      });
    }
  }

  /**
   * Delete material (only for teacher who created it)
   */
  async deleteMaterial(req, res) {
    try {
      const { materialId } = req.params;

      // Only teachers can delete materials
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat menghapus materi'
        });
      }

      const result = await materialService.deleteMaterial(materialId, req.user.id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete material error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') ? 404 :
                        error.message.includes('tidak memiliki akses') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal menghapus materi'
      });
    }
  }

  /**
   * Download material file
   */
  async downloadMaterial(req, res) {
    try {
      const { materialId } = req.params;

      // Get material details first to verify access
      const material = await materialService.getMaterialById(
        materialId,
        req.user.id,
        req.user.role
      );

      if (!material.fileUrl) {
        return res.status(404).json({
          success: false,
          message: 'File tidak tersedia untuk materi ini'
        });
      }

      // Return the file URL for download
      res.json({
        success: true,
        message: 'URL download berhasil diambil',
        data: {
          downloadUrl: material.fileUrl,
          fileName: material.fileName,
          fileSize: material.fileSize,
          mimeType: material.mimeType
        }
      });
    } catch (error) {
      console.error('Download material error:', error.message);
      
      const statusCode = error.message.includes('tidak ditemukan') ? 404 :
                        (error.message.includes('tidak memiliki akses') || 
                         error.message.includes('tidak terdaftar')) ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Gagal mengunduh materi'
      });
    }
  }

  /**
   * Get material statistics for teacher dashboard
   */
  async getMaterialStats(req, res) {
    try {
      // Only teachers can view their material stats
      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Hanya guru yang dapat melihat statistik materi'
        });
      }

      const stats = await materialService.getMaterialStats(req.user.id);

      res.json({
        success: true,
        message: 'Statistik materi berhasil diambil',
        data: { stats }
      });
    } catch (error) {
      console.error('Get material stats error:', error.message);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil statistik materi'
      });
    }
  }
}

module.exports = new MaterialController();