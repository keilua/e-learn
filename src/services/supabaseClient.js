import { supabase } from '@/lib/customSupabaseClient';

// Export supabase as named export as well to prevent import errors
export { supabase };

// Course operations
export const courseService = {
  async getAllPublishedCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:users(id, full_name, avatar_url),
        modules(id, title, order_index)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getCourseById(courseId) {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:users(id, full_name, avatar_url, bio),
        modules(
          *,
          quizzes(id, title, passing_score)
        )
      `)
      .eq('id', courseId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createCourse(courseData) {
    const { data, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateCourse(courseId, updates) {
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteCourse(courseId) {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);
    
    if (error) throw error;
  }
};

// Module operations
export const moduleService = {
  async getModulesByCourse(courseId) {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async createModule(moduleData) {
    const { data, error } = await supabase
      .from('modules')
      .insert(moduleData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateModule(moduleId, updates) {
    const { data, error } = await supabase
      .from('modules')
      .update(updates)
      .eq('id', moduleId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Enrollment operations
export const enrollmentService = {
  async enrollInCourse(courseId) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('course_enrollments')
      .insert({
        user_id: user.id,
        course_id: courseId,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserEnrollments() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        course:courses(
          *,
          instructor:users(full_name, avatar_url)
        )
      `)
      .eq('user_id', user.id)
      .order('enrollment_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async updateEnrollmentProgress(enrollmentId, progressPercentage) {
    const updates = {
      progress_percentage: progressPercentage
    };

    if (progressPercentage >= 100) {
      updates.completion_date = new Date().toISOString();
      updates.status = 'completed';
    }

    const { data, error } = await supabase
      .from('course_enrollments')
      .update(updates)
      .eq('id', enrollmentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Quiz operations
export const quizService = {
  async getQuizWithQuestions(quizId) {
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        questions(
          *,
          answers(*)
        )
      `)
      .eq('id', quizId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createQuiz(quizData) {
    const { data, error } = await supabase
      .from('quizzes')
      .insert(quizData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async addQuestion(questionData) {
    const { data, error } = await supabase
      .from('questions')
      .insert(questionData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async addAnswers(answersData) {
    const { data, error } = await supabase
      .from('answers')
      .insert(answersData)
      .select();
    
    if (error) throw error;
    return data;
  }
};

// Certificate operations
export const certificateService = {
  async generateCertificate(enrollmentId) {
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const { data, error } = await supabase
      .from('certificates')
      .insert({
        enrollment_id: enrollmentId,
        certificate_number: certificateNumber,
        certificate_url: `/certificates/${certificateNumber}.pdf`
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserCertificates() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('certificates')
      .select(`
        *,
        enrollment:course_enrollments(
          course:courses(title, instructor:users(full_name))
        )
      `)
      .eq('enrollment.user_id', user.id);
    
    if (error) throw error;
    return data;
  }
};

// User operations
export const userService = {
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAllInstructors() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'instructor');
    
    if (error) throw error;
    return data;
  }
};

export default supabase;