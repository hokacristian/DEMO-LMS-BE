const express = require('express');
const materialController = require('../controllers/materialController');
const { authenticate, requireTeacher } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * @route   POST /api/materials
 * @desc    Create new material
 * @access  Private (Teacher only)
 */
router.post('/', 
  authenticate, 
  requireTeacher,
  upload.single('file'), // Handle file upload
  materialController.createMaterial
);

/**
 * @route   GET /api/materials/classes/:classId
 * @desc    Get materials for a class
 * @access  Private (enrolled students or teaching teachers)
 */
router.get('/classes/:classId', authenticate, materialController.getClassMaterials);

/**
 * @route   GET /api/materials/:materialId
 * @desc    Get single material details
 * @access  Private (enrolled students or teaching teachers)
 */
router.get('/:materialId', authenticate, materialController.getMaterialById);

/**
 * @route   PUT /api/materials/:materialId
 * @desc    Update material
 * @access  Private (Teacher who created it)
 */
router.put('/:materialId', 
  authenticate, 
  requireTeacher,
  upload.single('file'), // Handle new file upload
  materialController.updateMaterial
);

/**
 * @route   DELETE /api/materials/:materialId
 * @desc    Delete material
 * @access  Private (Teacher who created it)
 */
router.delete('/:materialId', authenticate, requireTeacher, materialController.deleteMaterial);

/**
 * @route   GET /api/materials/:materialId/download
 * @desc    Download material file
 * @access  Private (enrolled students or teaching teachers)
 */
router.get('/:materialId/download', authenticate, materialController.downloadMaterial);

/**
 * @route   GET /api/materials/stats/teacher
 * @desc    Get material statistics for teacher
 * @access  Private (Teacher only)
 */
router.get('/stats/teacher', authenticate, requireTeacher, materialController.getMaterialStats);

module.exports = router;