import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const MessageCard = ({ message, onEdit, onDelete, isReply = false }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isAuthor = user?.id === message.user_id;
  const authorInitials = message.user?.full_name
    ? message.user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : '??';

  const handleSave = () => {
    onEdit(message.id, editContent);
    setIsEditing(false);
  };

  return (
    <Card className={`mb-4 ${isReply ? 'ml-8 border-l-4 border-l-primary/20' : ''}`}>
      <CardHeader className="flex flex-row items-center gap-4 pb-2 space-y-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={message.user?.avatar_url} />
          <AvatarFallback>{authorInitials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{message.user?.full_name || 'Unknown User'}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="py-2">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea 
              value={editContent} 
              onChange={(e) => setEditContent(e.target.value)} 
              className="min-h-[100px]"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        )}
      </CardContent>

      {isAuthor && !isEditing && (
        <CardFooter className="pt-0 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-3 w-3 mr-1" /> Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(message.id)}>
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MessageCard;