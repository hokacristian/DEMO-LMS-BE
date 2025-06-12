const express = require('express');
const classController = require('../controllers/classController');
const { authenticate, requireTeacher, requireStudent } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/classes
 * @desc    Create new class
 * @access  Private (Teacher & Admin only)
 */
router.post('/', authenticate, classController.createClass);

/**
 * @route   GET /api/classes
 * @desc    Get user's classes (different view for teacher vs student)
 * @access  Private
 */
router.get('/', authenticate, classController.getUserClasses);

/**
 * @route   POST /api/classes/enroll
 * @desc    Enroll student to class using enrollment code
 * @access  Private (Student only)
 */
router.post('/enroll', authenticate, classController.enrollStudent);

/**
 * @route   GET /api/classes/:classId
 * @desc    Get class details
 * @access  Private (enrolled students or teaching teachers)
 */
router.get('/:classId', authenticate, classController.getClassDetails);

/**
 * @route   PUT /api/classes/:classId
 * @desc    Update class details
 * @access  Private (Teacher who owns the class)
 */
router.put('/:classId', authenticate, requireTeacher, classController.updateClass);

/**
 * @route   GET /api/classes/:classId/students
 * @desc    Get list of students in class
 * @access  Private (Teacher only)
 */
router.get('/:classId/students', authenticate, requireTeacher, classController.getClassStudents);

/**
 * @route   DELETE /api/classes/:classId/leave
 * @desc    Leave class (for students)
 * @access  Private (Student only)
 */
router.delete('/:classId/leave', authenticate, requireStudent, classController.leaveClass);

module.exports = router;