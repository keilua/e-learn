import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { sendBrowserNotification } from '@/utils/BrowserNotification';
import { emailNotificationService } from '@/services/EmailNotificationService';

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

// Main Notification Service
class NotificationService {
  constructor() {
    this.subscription = null;
  }

  // Create a new notification
  async createNotification({ userId, type, title, message, referenceId = null, referenceType = null }) {
    try {
      // 1. Check user preferences with retry
      const { data: prefs } = await retryOperation(() => 
        supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
      );

      // Default to true if no prefs found
      const typeEnabled = prefs?.types?.[type] ?? true;

      if (!typeEnabled) return null; // User disabled this type

      // 2. Insert into database (always stored for history/app center) with retry
      const { data, error } = await retryOperation(() => 
        supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type,
            title,
            message,
            reference_id: referenceId,
            reference_type: referenceType
          })
          .select()
          .single()
      );

      if (error) throw error;

      // 3. Handle external channels (Email/Browser)
      
      // Browser Notification (Client-side trigger simulation)
      if (prefs?.browser_enabled) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.id === userId) {
             sendBrowserNotification(title, { body: message });
        }
      }

      // Email Notification
      if (prefs?.email_enabled && prefs?.frequency === 'immediate') {
         await emailNotificationService.sendEmail({
            to: userId,
            subject: `New Notification: ${title}`,
            text: message,
            html: `<p>${message}</p>`
         });
      }

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  // Real-time subscription setup
  subscribe(userId, onNotification) {
    if (this.subscription) this.unsubscribe();

    try {
      this.subscription = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotification = payload.new;
            
            // Trigger browser notification if permitted and app is in background
            if (document.hidden) {
               sendBrowserNotification(newNotification.title, { body: newNotification.message });
            } else {
               // In-app toast
               toast({
                  title: newNotification.title,
                  description: newNotification.message,
               });
            }

            if (onNotification) onNotification(newNotification);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // console.log('Notification channel subscribed');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Notification channel error');
          }
        });
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
    }
      
    return this.subscription;
  }

  unsubscribe() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }
  }

  async markAsRead(notificationId) {
    try {
      const { error } = await retryOperation(() => 
        supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
      );
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      const { error } = await retryOperation(() => 
        supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
          .eq('is_read', false)
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getHistory(userId, page = 1, pageSize = 20) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      const { data, count, error } = await retryOperation(() => 
        supabase
          .from('notifications')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to)
      );

      if (error) throw error;
      return { data, count };
    } catch (error) {
      console.error('Error fetching notification history:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();