import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/NotificationService';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCheck, Trash2 } from 'lucide-react';
import NotificationItem from '@/components/notifications/NotificationItem';
import { supabase } from '@/lib/customSupabaseClient';

const NotificationHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, page]);

  const fetchNotifications = async () => {
    try {
      const { data, count } = await notificationService.getHistory(user.id, page, 20);
      
      if (page === 1) {
        setNotifications(data || []);
      } else {
        setNotifications(prev => [...prev, ...(data || [])]);
      }
      
      if (data.length < 20) setHasMore(false);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };
  
  const handleDeleteAll = async () => {
      // In a real app we might want soft delete or archive
      const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
      if(!error) setNotifications([]);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold">Notifications</h1>
                <p className="text-muted-foreground">History of your alerts and updates.</p>
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && page === 1 ? (
             <div className="p-6 space-y-4">
               {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
             </div>
          ) : notifications.length === 0 ? (
             <div className="p-12 text-center text-muted-foreground">
                <p>No notifications found.</p>
             </div>
          ) : (
            <div className="divide-y">
               {notifications.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-muted/20 transition-colors">
                     <NotificationItem 
                        notification={item} 
                        onMarkRead={handleMarkAsRead}
                        className="border-none p-0 bg-transparent hover:bg-transparent"
                     />
                  </div>
               ))}
            </div>
          )}
          
          {hasMore && !loading && (
             <div className="p-4 text-center border-t">
                <Button variant="ghost" onClick={() => setPage(p => p + 1)}>Load More</Button>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationHistory;