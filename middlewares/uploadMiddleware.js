const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory for processing

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    
    // Videos (for future use)
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed'
  ];

  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.mp4', '.avi', '.mov', '.wmv',
    '.zip', '.rar'
  ];

  // Check MIME type
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Check file extension as fallback
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipe file tidak diizinkan. File yang diizinkan: ${allowedExtensions.join(', ')}`), false);
    }
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Only 1 file per request
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File terlalu besar. Maksimal 50MB'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Terlalu banyak file. Maksimal 1 file'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Field file tidak diharapkan'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Error upload file: ' + error.message
        });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Error upload file'
    });
  }
  next();
};

// Utility function to validate file size and type after upload
const validateUploadedFile = (file) => {
  if (!file) return null;

  // Additional validation
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new Error('File terlalu besar. Maksimal 50MB');
  }

  // Return file info for further processing
  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    buffer: file.buffer
  };
};

// Utility function to generate safe filename
const generateSafeFilename = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension)
    .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
    .substring(0, 50); // Limit length

  return `${prefix}${timestamp}_${randomString}_${baseName}${extension}`;
};

// Utility function to get file category based on MIME type
const getFileCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
  return 'other';
};

// Middleware to log file upload attempts
const logFileUpload = (req, res, next) => {
  if (req.file) {
    console.log(`File upload attempt: ${req.file.originalname} (${req.file.size} bytes) by user ${req.user?.id}`);
  }
  next();
};

module.exports = {
  upload,
  handleMulterError,
  validateUploadedFile,
  generateSafeFilename,
  getFileCategory,
  logFileUpload
};