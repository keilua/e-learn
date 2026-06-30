import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/customSupabaseClient';
import MessageCard from '@/components/forum/MessageCard';
import ReplyForm from '@/components/forum/ReplyForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, CheckCircle2, Lock, Loader2 } from 'lucide-react';

const DiscussionDetail = () => {
  const { discussionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [discussion, setDiscussion] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyLoading, setReplyLoading] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);

  useEffect(() => {
    fetchDiscussionData();
  }, [discussionId, user]);

  const fetchDiscussionData = async () => {
    try {
      // 1. Fetch Discussion
      const { data: disc, error: discError } = await supabase
        .from('discussions')
        .select(`
            *,
            user:users(id, full_name, avatar_url)
        `)
        .eq('id', discussionId)
        .single();
      
      if (discError) throw discError;
      setDiscussion(disc);

      // 2. Fetch Replies
      const { data: reps, error: repError } = await supabase
        .from('discussion_replies')
        .select(`
            *,
            user:users(id, full_name, avatar_url)
        `)
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: true });
        
      if (repError) throw repError;
      setReplies(reps);

      // 3. Check instructor permissions
      if (user && disc.course_id) {
         const { data: course } = await supabase
            .from('courses')
            .select('instructor_id')
            .eq('id', disc.course_id)
            .single();
         if (course && course.instructor_id === user.id) {
             setIsInstructor(true);
         }
      }

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Could not load discussion." });
      navigate('/forum');
    } finally {
      setLoading(false);
    }
  };

  const handlePostReply = async (content) => {
    if (!user) return;
    setReplyLoading(true);
    try {
      const replyId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Insert Reply with explicit ID and timestamps to satisfy NOT NULL constraints
      const { data, error } = await supabase
        .from('discussion_replies')
        .insert({
          id: replyId,
          discussion_id: discussionId,
          user_id: user.id,
          content: content,
          created_at: now,
          updated_at: now
        })
        .select(`*, user:users(id, full_name, avatar_url)`)
        .single();

      if (error) throw error;

      setReplies([...replies, data]);
      
      // Send Notification
      if (discussion.user_id !== user.id) {
          await supabase.from('notifications').insert({
              user_id: discussion.user_id,
              sender_id: user.id,
              type: 'reply',
              reference_id: discussion.id,
              message: `${user.user_metadata?.full_name || 'Someone'} replied to your discussion: "${discussion.title}"`,
              created_at: now
          });
      }

      toast({ title: "Reply posted!" });
      return true; // Signal success
    } catch (error) {
      console.error("Reply error:", error);
      toast({ variant: "destructive", title: "Failed to post reply", description: error.message });
      return false; // Signal failure
    } finally {
      setReplyLoading(false);
    }
  };

  const handleToggleResolve = async () => {
      try {
          const { error } = await supabase
            .from('discussions')
            .update({ is_resolved: !discussion.is_resolved })
            .eq('id', discussionId);
          
          if (error) throw error;
          
          setDiscussion(prev => ({ ...prev, is_resolved: !prev.is_resolved }));
          toast({ title: `Discussion marked as ${!discussion.is_resolved ? 'resolved' : 'unresolved'}` });
      } catch (error) {
          toast({ variant: "destructive", title: "Error updating status" });
      }
  };

  const handleEditMessage = async (id, newContent, isMainPost = false) => {
      try {
          const table = isMainPost ? 'discussions' : 'discussion_replies';
          const { error } = await supabase
            .from(table)
            .update({ content: newContent, updated_at: new Date().toISOString() })
            .eq('id', id);
            
          if (error) throw error;

          if (isMainPost) {
              setDiscussion(prev => ({ ...prev, content: newContent }));
          } else {
              setReplies(prev => prev.map(r => r.id === id ? { ...r, content: newContent } : r));
          }
          toast({ title: "Updated successfully" });
      } catch (error) {
          toast({ variant: "destructive", title: "Update failed" });
      }
  };

  const handleDeleteMessage = async (id, isMainPost = false) => {
      if (!window.confirm("Are you sure you want to delete this?")) return;
      try {
        const table = isMainPost ? 'discussions' : 'discussion_replies';
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;

        if (isMainPost) {
            navigate('/forum');
            toast({ title: "Discussion deleted" });
        } else {
            setReplies(prev => prev.filter(r => r.id !== id));
            toast({ title: "Reply deleted" });
        }
      } catch (error) {
          toast({ variant: "destructive", title: "Delete failed" });
      }
  };

  if (loading) return (
    <div className="container max-w-4xl py-10 px-4 space-y-4">
        <div className="h-8 bg-muted w-1/3 rounded animate-pulse"/>
        <div className="h-32 bg-muted rounded animate-pulse"/>
    </div>
  );

  if (!discussion) return <div className="p-8 text-center text-muted-foreground">Discussion not found</div>;

  return (
    <div className="container max-w-4xl py-10 px-4">
      <Button variant="ghost" onClick={() => navigate('/forum')} className="mb-6 pl-0 hover:pl-2 transition-all">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Forum
      </Button>

      <div className="mb-6">
          <div className="flex justify-between items-start gap-4 mb-2">
            <h1 className="text-3xl font-bold">{discussion.title}</h1>
            <Badge variant={discussion.is_resolved ? "outline" : "secondary"} className={`${discussion.is_resolved ? 'bg-green-100 text-green-800 border-green-200' : ''}`}>
                {discussion.is_resolved ? <><CheckCircle2 className="w-3 h-3 mr-1"/> Resolved</> : 'Open'}
            </Badge>
          </div>
          
          {isInstructor && (
              <Button variant="outline" size="sm" onClick={handleToggleResolve} className="mt-2">
                  {discussion.is_resolved ? 'Re-open Discussion' : 'Mark as Resolved'}
              </Button>
          )}
      </div>

      <div className="space-y-8">
          {/* Main Post */}
          <div className="relative">
             <MessageCard 
                message={discussion} 
                onEdit={(id, content) => handleEditMessage(id, content, true)}
                onDelete={(id) => handleDeleteMessage(id, true)}
             />
             <div className="absolute -left-3 top-12 bottom-0 w-0.5 bg-border ml-8 hidden md:block" />
          </div>

          {/* Replies */}
          <div className="space-y-4">
              <h3 className="text-xl font-semibold pl-1">{replies.length} Replies</h3>
              {replies.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                  No replies yet. Be the first to start the conversation!
                </div>
              )}
              {replies.map(reply => (
                  <MessageCard 
                    key={reply.id} 
                    message={reply} 
                    isReply={true}
                    onEdit={(id, content) => handleEditMessage(id, content, false)}
                    onDelete={(id) => handleDeleteMessage(id, false)}
                  />
              ))}
          </div>

          {/* Reply Form */}
          {discussion.is_resolved ? (
              <div className="bg-muted/50 p-6 rounded-lg text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Lock className="h-8 w-8 opacity-50" />
                  <p>This discussion has been marked as resolved and is closed for new replies.</p>
              </div>
          ) : (
              <ReplyForm onSubmit={handlePostReply} loading={replyLoading} />
          )}
      </div>
    </div>
  );
};

export default DiscussionDetail;