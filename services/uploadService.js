const supabase = require('../configs/supabase');
const { generateSafeFilename, getFileCategory } = require('../middlewares/uploadMiddleware');

class UploadService {
  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(file, folder = 'general', userId = null) {
    try {
      if (!file || !file.buffer) {
        throw new Error('File buffer tidak tersedia');
      }

      // Generate safe filename
    const prefix = userId ? `${userId}_` : '';
    const safeFilename = generateSafeFilename(file.originalname, prefix);
    
    // Determine file path
    const filePath = `${folder}/${safeFilename}`;
    
    // Get file category for bucket selection
    const category = getFileCategory(file.mimetype);
    
    // Choose bucket based on file type or use default
    const bucketName = this.getBucketName(category);
    
    // Create bucket if it doesn't exist
    await this.createBucketIfNotExists(bucketName, true); // true untuk public bucket

    console.log(`📁 Uploading file: ${filePath} to bucket: ${bucketName}`);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        duplex: 'half'
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw new Error(`Upload gagal: ${error.message}`);
    }

      // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const fileInfo = {
      fileUrl: urlData.publicUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      bucketName: bucketName,
      filePath: filePath
    };

    console.log('✅ File uploaded successfully:', fileInfo.fileUrl);
    return fileInfo;

  } catch (error) {
    console.error('❌ Upload service error:', error);
    throw error;
  }
}

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(fileUrl, bucketName = null) {
    try {
      if (!fileUrl) return;

      // Extract file path from URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      
      // If bucket not provided, try to extract from URL
      if (!bucketName) {
        bucketName = pathParts[4]; // Assuming URL structure
      }
      
      const filePath = pathParts.slice(5).join('/');

      console.log(`🗑️ Deleting file: ${filePath} from bucket: ${bucketName}`);

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Delete file error:', error);
        // Don't throw error for delete failures, just log
        return false;
      }

      console.log('✅ File deleted successfully');
      return true;

    } catch (error) {
      console.error('❌ Delete file error:', error);
      return false;
    }
  }

  /**
   * Get bucket name based on file category
   */
  getBucketName(category) {
    switch (category) {
      case 'image':
        return 'images';
      case 'video':
        return 'videos';
      case 'document':
      case 'pdf':
        return 'documents';
      default:
        return 'materii'; // Use your existing bucket
    }
  }

  /**
   * Upload material file
   */
  async uploadMaterial(file, classId, teacherId) {
    const folder = `materials/class-${classId}`;
    return this.uploadFile(file, folder, teacherId);
  }

  /**
   * Upload assignment attachment
   */
  async uploadAssignmentAttachment(file, classId, teacherId) {
    const folder = `assignments/attachments/class-${classId}`;
    return this.uploadFile(file, folder, teacherId);
  }

  /**
   * Upload assignment submission
   */
  async uploadSubmission(file, assignmentId, studentId) {
    const folder = `assignments/submissions/assignment-${assignmentId}`;
    return this.uploadFile(file, folder, studentId);
  }

  /**
   * Create bucket if it doesn't exist
   */
  async createBucketIfNotExists(bucketName, isPublic = true) {
    try {
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: isPublic,
        allowedMimeTypes: [
          'image/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'video/*',
          'text/*'
        ],
        fileSizeLimit: 52428800 // 50MB
      });

      if (error && error.message !== 'Bucket already exists') {
        console.error('❌ Create bucket error:', error);
        return false;
      }

      console.log('✅ Bucket ready:', bucketName);
      return true;
    } catch (error) {
      console.error('❌ Create bucket error:', error);
      return false;
    }
  }
}

module.exports = new UploadService();