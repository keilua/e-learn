import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/NotificationService';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import NotificationItem from './NotificationItem';

const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    loadNotifications();

    // Real-time subscription
    const subscription = notificationService.subscribe(user.id, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      notificationService.unsubscribe();
    };
  }, [user]);

  const loadNotifications = async () => {
    try {
      // Get recent 10 notifications for the dropdown
      const { data } = await notificationService.getHistory(user.id, 1, 10);
      if (data) {
        setNotifications(data);
        const unread = data.filter(n => !n.is_read).length;
        // In a real app we'd query just the count of unread, 
        // but for now we approximate with the recent list
        setUnreadCount(unread); 
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  };

  const handleNotificationClick = (notification) => {
    handleMarkAsRead(notification.id);
    setIsOpen(false);
    
    // Navigation logic based on reference type
    if (notification.reference_type === 'discussion' && notification.reference_id) {
        navigate(`/forum/discussion/${notification.reference_id}`);
    } else if (notification.reference_type === 'course' && notification.reference_id) {
        navigate(`/courses/${notification.reference_id}`);
    } else if (notification.reference_type === 'badge') {
        navigate(`/dashboard/student/badges`);
    } else if (notification.reference_type === 'donation') {
        if (user.user_metadata?.role === 'instructor') {
            navigate('/dashboard/teacher/donations');
        } else {
            navigate('/dashboard/student/donations');
        }
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full animate-in zoom-in"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 sm:w-96" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between py-3">
          <span className="font-semibold">Notifications</span>
          <div className="flex gap-1">
             <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={handleMarkAllRead}
                title="Mark all as read"
             >
                <CheckCheck className="h-4 w-4" />
             </Button>
             <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => {
                    setIsOpen(false);
                    navigate('/settings/notifications');
                }}
                title="Settings"
             >
                <Settings className="h-4 w-4" />
             </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[350px]">
          <div className="p-2 space-y-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-center px-4">
                <Bell className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((item) => (
                <NotificationItem 
                  key={item.id} 
                  notification={item} 
                  onMarkRead={handleMarkAsRead}
                  onClick={handleNotificationClick}
                  className="hover:bg-accent/50 text-left border-none p-3"
                />
              ))
            )}
          </div>
        </ScrollArea>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="w-full text-center justify-center p-3 font-medium text-primary cursor-pointer"
          onClick={() => {
            setIsOpen(false);
            navigate('/notifications');
          }}
        >
          View Notification History
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter;