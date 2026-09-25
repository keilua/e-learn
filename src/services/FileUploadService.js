import { supabase } from '@/lib/customSupabaseClient';
import { validatePdfFile, validateVideoFile } from '@/lib/fileValidation';

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
 * Generates a unique filename with timestamp
 */
const generateUniqueFileName = (originalName, extension) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
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
    // SEC-009 : type réel (signature binaire) et taille
    const { mimeType, extension } = await validatePdfFile(file, MAX_FILE_SIZE);

    // Generate unique filename (extension issue du type détecté)
    const fileName = generateUniqueFileName(file.name, extension);
    const filePath = lessonId ? `lessons/${lessonId}/${fileName}` : fileName;

    // Upload to Supabase Storage with retry
    const { data, error } = await retryOperation(() => 
      supabase.storage
        .from('lesson-pdfs')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: mimeType,
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
    // SEC-009 : type réel (signature binaire) et taille
    const { mimeType, extension } = await validateVideoFile(file, MAX_FILE_SIZE);

    // Generate unique filename (extension issue du type détecté)
    const fileName = generateUniqueFileName(file.name, extension);
    const filePath = lessonId ? `lessons/${lessonId}/${fileName}` : fileName;

    // Upload to Supabase Storage with retry
    const { data, error } = await retryOperation(() => 
      supabase.storage
        .from('lesson-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: mimeType,
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