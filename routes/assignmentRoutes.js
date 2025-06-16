const express = require('express');
const assignmentController = require('../controllers/assignmentController');
const { authenticate, requireTeacher, requireStudent } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * @route   POST /api/assignments
 * @desc    Create new assignment
 * @access  Private (Teacher only)
 */
router.post('/', 
  authenticate, 
  requireTeacher,
  upload.single('attachment'), // Handle attachment file
  assignmentController.createAssignment
);

/**
 * @route   PUT /api/assignments/:assignmentId/publish
 * @desc    Publish assignment (change from DRAFT to PUBLISHED)
 * @access  Private (Teacher who created it)
 */
router.put('/:assignmentId/publish', 
  authenticate, 
  requireTeacher, 
  assignmentController.publishAssignment
);

/**
 * @route   GET /api/assignments/student/all
 * @desc    Get all assignments from all student's classes
 * @access  Private (Student only)
 */
router.get('/student/all', 
  authenticate, 
  requireStudent, 
  assignmentController.getAllStudentAssignments
);

/**
 * @route   GET /api/assignments/student/grades
 * @desc    Get all graded assignments for student (NEW FEATURE)
 * @access  Private (Student only)
 */
router.get('/student/grades', 
  authenticate, 
  requireStudent, 
  assignmentController.getAllStudentGrades
);

/**
 * 🆕 @route   GET /api/assignments/classes/:classId/grades
 * @desc    Get assignment grades for a specific class (NEW FEATURE)
 * @access  Private (Student only)
 */
router.get('/classes/:classId/grades', 
  authenticate, 
  requireStudent, 
  assignmentController.getClassGrades
);

/**
 * @route   GET /api/assignments/classes/:classId
 * @desc    Get assignments for a class
 * @access  Private (enrolled students or teaching teachers)
 */
router.get('/classes/:classId', authenticate, assignmentController.getClassAssignments);

/**
 * @route   GET /api/assignments/:assignmentId
 * @desc    Get single assignment details
 * @access  Private (enrolled students or teaching teachers)
 */
router.get('/:assignmentId', authenticate, assignmentController.getAssignmentById);

/**
 * @route   PUT /api/assignments/:assignmentId
 * @desc    Update assignment
 * @access  Private (Teacher who created it)
 */
router.put('/:assignmentId', 
  authenticate, 
  requireTeacher,
  upload.single('attachment'), // Handle new attachment
  assignmentController.updateAssignment
);

/**
 * @route   DELETE /api/assignments/:assignmentId
 * @desc    Delete assignment
 * @access  Private (Teacher who created it)
 */
router.delete('/:assignmentId', authenticate, requireTeacher, assignmentController.deleteAssignment);

/**
 * @route   POST /api/assignments/:assignmentId/submit
 * @desc    Submit assignment
 * @access  Private (Student only)
 */
router.post('/:assignmentId/submit', 
  authenticate, 
  requireStudent,
  upload.single('file'), // Handle submission file
  assignmentController.submitAssignment
);

/**
 * @route   GET /api/assignments/:assignmentId/submissions
 * @desc    Get assignment submissions
 * @access  Private (Teacher who created the assignment)
 */
router.get('/:assignmentId/submissions', 
  authenticate, 
  requireTeacher, 
  assignmentController.getAssignmentSubmissions
);

/**
 * @route   PUT /api/assignments/submissions/:submissionId/grade
 * @desc    Grade submission
 * @access  Private (Teacher who created the assignment)
 */
router.put('/submissions/:submissionId/grade', 
  authenticate, 
  requireTeacher, 
  assignmentController.gradeSubmission
);

module.exports = router;