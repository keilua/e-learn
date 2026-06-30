import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';

const ReplyForm = ({ onSubmit, loading }) => {
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    // Pass content to parent and wait for result
    const success = await onSubmit(content);
    
    // Only clear if submission was successful to prevent data loss
    if (success) {
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Leave a Reply</h3>
        <Textarea
          placeholder="Type your response here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[120px]"
          required
          disabled={loading}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !content.trim()}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Post Reply
        </Button>
      </div>
    </form>
  );
};

export default ReplyForm;