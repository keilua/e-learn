import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Check } from 'lucide-react';
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
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const subscribeToNotifications = () => {
    const subscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.type === 'reply' || notification.type === 'discussion') {
        navigate(`/forum/discussion/${notification.reference_id}`);
    }
    // Add other types as needed
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-background animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Notifications</p>
            <p className="text-xs leading-none text-muted-foreground">
              You have {unreadCount} unread messages
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((item) => (
              <DropdownMenuItem 
                key={item.id} 
                className="cursor-pointer flex flex-col items-start gap-1 p-3"
                onClick={() => handleNotificationClick(item)}
              >
                <div className="flex w-full justify-between items-start">
                    <span className={`text-sm ${!item.is_read ? 'font-semibold' : ''}`}>
                        {item.message}
                    </span>
                    {!item.is_read && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 shrink-0" />}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter;