import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service for handling Email Notifications
 * In a production environment, this would interface with a Supabase Edge Function
 * that wraps a provider like SendGrid, Resend, or AWS SES.
 */
class EmailNotificationService {
  
  /**
   * Send an email notification
   * @param {Object} params
   * @param {string} params.to - Recipient email or user ID
   * @param {string} params.subject - Email subject
   * @param {string} params.html - HTML content
   * @param {string} params.text - Plain text content
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      console.log(`[EmailService] Sending email to ${to}: ${subject}`);
      
      // Example of how you would call a Supabase Edge Function
      /*
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to, subject, html, text }
      });
      
      if (error) throw error;
      return data;
      */

      // For this frontend-only demo, we simulate success
      return { success: true, message: 'Email queued successfully' };
    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send a system alert email
   */
  async sendSystemAlert(userId, title, message) {
    // Fetch user email if only ID provided
    // const { data: user } = await supabase.from('users').select('email').eq('id', userId).single();
    
    return this.sendEmail({
      to: userId, // In real app, use user.email
      subject: `System Alert: ${title}`,
      text: message,
      html: `<div style="font-family: sans-serif;"><h2>${title}</h2><p>${message}</p></div>`
    });
  }
}

export const emailNotificationService = new EmailNotificationService();