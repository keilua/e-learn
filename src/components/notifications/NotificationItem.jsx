import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, Info, MessageSquare, Award, BookOpen, Heart, AlertCircle } from 'lucide-react';

const NotificationItem = ({ notification, onMarkRead, onClick, className }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'forum': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'badge': return <Award className="h-4 w-4 text-orange-500" />;
      case 'certificate': return <Award className="h-4 w-4 text-yellow-500" />;
      case 'course': return <BookOpen className="h-4 w-4 text-green-500" />;
      case 'donation': return <Heart className="h-4 w-4 text-red-500" />;
      case 'system': 
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div 
      className={cn(
        "flex gap-3 p-4 rounded-lg transition-colors border",
        notification.is_read ? "bg-background border-transparent" : "bg-muted/30 border-primary/20",
        className
      )}
    >
      <div className="mt-1 shrink-0">
        {getIcon(notification.type)}
      </div>
      
      <div className="flex-1 space-y-1 cursor-pointer" onClick={() => onClick && onClick(notification)}>
        <p className={cn("text-sm font-medium leading-none", !notification.is_read && "text-primary")}>
          {notification.title}
        </p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground pt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      {!notification.is_read && onMarkRead && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
          title="Mark as read"
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default NotificationItem;