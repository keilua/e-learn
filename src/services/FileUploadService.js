import { supabase } from '@/lib/customSupabaseClient';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

// Helper for exponential backoff
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

/**
 * Validates file size
 */
const validateFileSize = (file, maxSize = MAX_FILE_SIZE) => {
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    throw new Error(`File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`);
  }
};

/**
 * Validates PDF file type
 */
const validatePDFFile = (file) => {
  const validTypes = ['application/pdf'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a PDF file.');
  }
  validateFileSize(file);
};

/**
 * Validates video file type
 */
const validateVideoFile = (file) => {
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload MP4, WebM, or MOV video files.');
  }
  validateFileSize(file);
};

/**
 * Generates a unique filename with timestamp
 */
const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
  return `${nameWithoutExt}_${timestamp}_${randomString}.${extension}`;
};

/**
 * Uploads a PDF file to Supabase Storage
 * @param {File} file - The PDF file to upload
 * @param {string} lessonId - Optional lesson ID for organizing files
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export const uploadPDF = async (file, lessonId = null) => {
  try {
    // Validate file
    validatePDFFile(file);

    // Generate unique filename
    const fileName = generateUniqueFileName(file.name);
    const filePath = lessonId ? `lessons/${lessonId}/${fileName}` : fileName;

    // Upload to Supabase Storage with retry
    const { data, error } = await retryOperation(() => 
      supabase.storage
        .from('lesson-pdfs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
    );

    if (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload PDF. Please try again.');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('lesson-pdfs')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('PDF upload error:', error);
    throw error;
  }
};

/**
 * Uploads a video file to Supabase Storage
 * @param {File} file - The video file to upload
 * @param {string} lessonId - Optional lesson ID for organizing files
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export const uploadVideo = async (file, lessonId = null) => {
  try {
    // Validate file
    validateVideoFile(file);

    // Generate unique filename
    const fileName = generateUniqueFileName(file.name);
    const filePath = lessonId ? `lessons/${lessonId}/${fileName}` : fileName;

    // Upload to Supabase Storage with retry
    const { data, error } = await retryOperation(() => 
      supabase.storage
        .from('lesson-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
    );

    if (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload video. Please try again.');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('lesson-videos')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Video upload error:', error);
    throw error;
  }
};

/**
 * Deletes a file from Supabase Storage
 * @param {string} url - Public URL of the file
 * @param {string} bucket - Bucket name ('lesson-pdfs' or 'lesson-videos')
 */
export const deleteFile = async (url, bucket) => {
  try {
    // Extract file path from URL
    const urlParts = url.split(`${bucket}/`);
    if (urlParts.length < 2) {
      throw new Error('Invalid file URL');
    }
    const filePath = urlParts[1];

    const { error } = await retryOperation(() => 
      supabase.storage
        .from(bucket)
        .remove([filePath])
    );

    if (error) {
      console.error('Delete error:', error);
      throw new Error('Failed to delete file.');
    }
  } catch (error) {
    console.error('File deletion error:', error);
    throw error;
  }
};

export default {
  uploadPDF,
  uploadVideo,
  deleteFile
};