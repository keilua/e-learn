import { supabase } from '@/lib/customSupabaseClient';

export const authService = {
  /**
   * Sign up a new user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {Object} metadata - Additional user metadata (full_name, role, etc.)
   * @returns {Promise<Object>} User data and error if any
   */
  async signup(email, password, metadata = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.full_name || email.split('@')[0],
            role: metadata.role || 'student',
            ...metadata
          }
        }
      });

      if (error) {
        console.error('Signup error:', error.message);
        return { user: null, error };
      }

      // The user profile will be automatically created by the database trigger
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Signup exception:', error);
      return { user: null, error };
    }
  },

  /**
   * Sign in an existing user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} User data and error if any
   */
  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error.message);
        return { user: null, session: null, error };
      }

      return { 
        user: data.user, 
        session: data.session, 
        error: null 
      };
    } catch (error) {
      console.error('Login exception:', error);
      return { user: null, session: null, error };
    }
  },

  /**
   * Sign out the current user
   * @returns {Promise<Object>} Error if any
   */
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error.message);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Logout exception:', error);
      return { error };
    }
  },

  /**
   * Get the current authenticated user
   * @returns {Promise<Object>} User data and error if any
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Get current user error:', error.message);
        return { user: null, error };
      }

      // Also fetch the user profile from the users table
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Get profile error:', profileError.message);
          return { user, profile: null, error: profileError };
        }

        return { user, profile, error: null };
      }

      return { user: null, profile: null, error: null };
    } catch (error) {
      console.error('Get current user exception:', error);
      return { user: null, profile: null, error };
    }
  },

  /**
   * Get the current session
   * @returns {Promise<Object>} Session data and error if any
   */
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Get session error:', error.message);
        return { session: null, error };
      }

      return { session, error: null };
    } catch (error) {
      console.error('Get session exception:', error);
      return { session: null, error };
    }
  },

  /**
   * Reset password for a user
   * @param {string} email - User's email
   * @returns {Promise<Object>} Error if any
   */
  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        console.error('Reset password error:', error.message);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Reset password exception:', error);
      return { error };
    }
  },

  /**
   * Update user password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} User data and error if any
   */
  async updatePassword(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Update password error:', error.message);
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Update password exception:', error);
      return { user: null, error };
    }
  },

  /**
   * Listen to auth state changes
   * @param {Function} callback - Callback function to handle auth state changes
   * @returns {Object} Subscription object
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};

export default authService;