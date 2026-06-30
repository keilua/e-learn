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
   * Checks if a user has completed a course and handles rewards.
   */
  async checkAndProcessCompletion(userId, courseId) {
    try {
      // 1. Get all modules for the course
      const { data: modules, error: modulesError } = await retryOperation(() => 
        supabase
          .from('modules')
          .select('id')
          .eq('course_id', courseId)
      );

      if (modulesError) throw modulesError;
      const moduleIds = modules.map(m => m.id);

      if (moduleIds.length === 0) return { completed: false, message: 'No modules found' };

      // 2. Get all lessons and quizzes
      const [lessonsResult, quizzesResult] = await Promise.all([
        retryOperation(() => supabase.from('lessons').select('id, is_published').in('module_id', moduleIds).eq('is_published', true)),
        retryOperation(() => supabase.from('quizzes').select('id').in('module_id', moduleIds))
      ]);

      if (lessonsResult.error) throw lessonsResult.error;
      if (quizzesResult.error) throw quizzesResult.error;

      const lessonIds = lessonsResult.data.map(l => l.id);
      const quizIds = quizzesResult.data.map(q => q.id);

      // 3. Check progress
      let completedLessonIds = new Set();
      let passedQuizIds = new Set();

      if (lessonIds.length > 0) {
        const { data: lessonProgress } = await retryOperation(() => 
          supabase.from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', userId)
            .eq('is_completed', true)
            .in('lesson_id', lessonIds)
        );
        
        if (lessonProgress) {
          lessonProgress.forEach(p => completedLessonIds.add(p.lesson_id));
        }
      }

      if (quizIds.length > 0) {
        const { data: quizAttempts } = await retryOperation(() => 
          supabase.from('quiz_attempts')
            .select('quiz_id')
            .eq('user_id', userId)
            .eq('is_passed', true)
            .in('quiz_id', quizIds)
        );
          
        if (quizAttempts) {
          quizAttempts.forEach(a => passedQuizIds.add(a.quiz_id));
        }
      }

      const allLessonsComplete = lessonIds.every(id => completedLessonIds.has(id));
      const allQuizzesPassed = quizIds.every(id => passedQuizIds.has(id));

      const isCourseCompleted = allLessonsComplete && allQuizzesPassed;
      
      // Calculate percentage
      const totalItems = lessonIds.length + quizIds.length;
      const completedItems = completedLessonIds.size + passedQuizIds.size;
      const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      // Update progress immediately
      await retryOperation(() => 
        supabase
          .from('course_enrollments')
          .update({ progress_percentage: progressPercentage })
          .eq('user_id', userId)
          .eq('course_id', courseId)
      );

      if (!isCourseCompleted) {
        return { completed: false, progress: progressPercentage };
      }

      // 4. Handle Completion Rewards
      
      // Check if already marked completed
      const { data: enrollment } = await retryOperation(() => 
        supabase
          .from('course_enrollments')
          .select('status, id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .single()
      );

      if (enrollment?.status === 'completed') {
        return { completed: true, newlyCompleted: false };
      }

      // Mark as completed
      await retryOperation(() => 
        supabase
          .from('course_enrollments')
          .update({ 
            status: 'completed', 
            completion_date: new Date().toISOString(),
            progress_percentage: 100
          })
          .eq('id', enrollment.id)
      );

      // 5. Generate Certificate
      const { data: certificate, error: certError } = await retryOperation(() => 
        supabase
          .from('certificates')
          .insert({
              enrollment_id: enrollment.id,
              certificate_number: `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              issued_date: new Date().toISOString()
          })
          .select()
          .single()
      );

      if (certError && certError.code !== '23505') {
         console.error("Certificate generation error", certError);
      }

      // 6. Award Badge (with default fallback)
      let badge = null;
      try {
        // Find existing course badge
        const { data: existingBadge } = await retryOperation(() => 
          supabase
            .from('badges')
            .select('id')
            .eq('course_id', courseId)
            .maybeSingle()
        );

        badge = existingBadge;

        if (!badge) {
          // Create default badge for this course if none exists
          const { data: course } = await retryOperation(() => supabase.from('courses').select('title').eq('id', courseId).single());
          const { data: newBadge } = await retryOperation(() => 
            supabase
              .from('badges')
              .insert({
                  course_id: courseId,
                  name: `${course.title} Master`,
                  description: `Awarded for successfully completing the course: ${course.title}`,
                  image_url: 'https://images.unsplash.com/photo-1567427018141-0584cfcbf1b8?w=400&h=400&fit=crop' // Default gold medal image
              })
              .select()
              .single()
          );
          badge = newBadge;
        }

        if (badge) {
          // Check if already awarded
          const { data: existingUserBadge } = await retryOperation(() => 
            supabase
              .from('user_badges')
              .select('id')
              .eq('user_id', userId)
              .eq('badge_id', badge.id)
              .maybeSingle()
          );

          if (!existingUserBadge) {
            await retryOperation(() => 
              supabase.from('user_badges').insert({
                  user_id: userId,
                  badge_id: badge.id,
                  earned_at: new Date().toISOString()
              })
            );
          }
        }
      } catch (badgeError) {
        console.error("Error awarding badge:", badgeError);
        // Don't fail the whole completion if badge fails
      }

      return { 
          completed: true, 
          newlyCompleted: true,
          certificate: certificate,
          badge: badge
      };

    } catch (error) {
      console.error('Completion check failed:', error);
      return { completed: false, error };
    }
  }
};