import { supabase } from '@/lib/customSupabaseClient';

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

export const completionService = {
  /**
   * Creates a course_enrollments row if the user doesn't have one yet.
   * Content is reachable straight from the course curriculum without going
   * through the "Enroll Now" button first, so without this a user's progress
   * gets tracked in lesson_progress/quiz_attempts but never surfaces on the
   * teacher's student list (which reads from course_enrollments).
   */
  async ensureEnrollment(userId, courseId) {
    try {
      const { data: existing } = await retryOperation(() =>
        supabase
          .from('course_enrollments')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle()
      );

      if (existing) return existing.id;

      const { data: created, error } = await retryOperation(() =>
        supabase
          .from('course_enrollments')
          .insert({
            id: crypto.randomUUID(),
            course_id: courseId,
            user_id: userId,
            status: 'active',
            enrollment_date: new Date().toISOString(),
            progress_percentage: 0
          })
          .select('id')
          .single()
      );

      if (error) throw error;
      return created.id;
    } catch (error) {
      console.error('Error ensuring enrollment:', error);
      return null;
    }
  },

  /**
   * Marks a lesson as complete using upsert to prevent duplicate key errors.
   */
  async markLessonComplete(userId, lessonId) {
    try {
      const { data, error } = await retryOperation(() => 
        supabase
          .from('lesson_progress')
          .upsert({ 
            user_id: userId,
            lesson_id: lessonId,
            is_completed: true,
            completed_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString()
          }, { onConflict: 'user_id, lesson_id' })
          .select()
          .single()
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      throw error;
    }
  },

  /**
   * Calcule la complétion du cours côté serveur (fonction SQL process_course_completion) :
   * progression, passage à l'état terminé, émission du certificat et du badge de cours.
   * Le client ne peut plus écrire ces données lui-même (SEC-008).
   * @returns {Promise<{ completed: boolean, newlyCompleted?: boolean, progress?: number, certificate?: object, badge?: object, error?: Error }>}
   */
  // eslint-disable-next-line no-unused-vars
  async checkAndProcessCompletion(userId, courseId) {
    try {
      const { data, error } = await retryOperation(() =>
        supabase.rpc('process_course_completion', { p_course_id: courseId })
      );
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Completion check failed:', error);
      return { completed: false, error };
    }
  }
};