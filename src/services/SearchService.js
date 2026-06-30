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

export const searchService = {
  /**
   * Perform a global search across multiple tables
   */
  async searchGlobal(query, filters = {}) {
    if (!query) return { courses: [], teachers: [], discussions: [] };

    const { level, type } = filters;
    const results = {
      courses: [],
      teachers: [],
      discussions: []
    };

    try {
      // 1. Search Courses
      if (!type || type === 'course') {
        let courseQuery = supabase
          .from('courses')
          .select('*, instructor:instructor_id(full_name)')
          .eq('is_published', true)
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

        if (level && level !== 'all') {
          courseQuery = courseQuery.eq('level', level);
        }

        const { data: courses } = await retryOperation(() => courseQuery.limit(10));
        results.courses = courses || [];
      }

      // 2. Search Teachers/Users
      if (!type || type === 'user') {
        const { data: users } = await retryOperation(() => 
          supabase
            .from('users')
            .select('*')
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(10)
        );
        results.teachers = users || [];
      }

      // 3. Search Discussions
      if (!type || type === 'forum') {
        const { data: discussions } = await retryOperation(() => 
          supabase
            .from('discussions')
            .select('*, user:user_id(full_name)')
            .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
            .limit(10)
        );
        results.discussions = discussions || [];
      }

      return results;

    } catch (error) {
      console.error('Search error:', error);
      // Return empty results instead of throwing to prevent UI crash
      return { courses: [], teachers: [], discussions: [] };
    }
  },

  /**
   * Get suggestions for autocomplete
   */
  async getSuggestions(query) {
    if (!query || query.length < 2) return [];

    const suggestions = [];

    try {
      // Simple parallel fetch for suggestions with retry
      const [courses, users] = await Promise.all([
        retryOperation(() => supabase.from('courses').select('id, title').ilike('title', `%${query}%`).limit(3)),
        retryOperation(() => supabase.from('users').select('id, full_name').ilike('full_name', `%${query}%`).limit(3))
      ]);

      if (courses.data) {
        courses.data.forEach(c => suggestions.push({ type: 'course', text: c.title, id: c.id }));
      }
      if (users.data) {
        users.data.forEach(u => suggestions.push({ type: 'user', text: u.full_name, id: u.id }));
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }

    return suggestions;
  },

  /**
   * Save search query to history
   */
  async saveSearch(userId, query) {
    if (!userId || !query) return;

    try {
      // Fire and forget, but with a single retry attempt
      await retryOperation(() => 
        supabase.from('search_history').insert({
          user_id: userId,
          query: query.trim()
        }), 
        2 // fewer retries for non-critical data
      );
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  },

  /**
   * Get user's search history
   */
  async getHistory(userId) {
    try {
      const { data, error } = await retryOperation(() => 
        supabase
          .from('search_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching search history:', error);
      throw error;
    }
  },

  /**
   * Clear user's search history
   */
  async clearHistory(userId) {
    try {
      const { error } = await retryOperation(() => 
        supabase
          .from('search_history')
          .delete()
          .eq('user_id', userId)
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing search history:', error);
      throw error;
    }
  }
};