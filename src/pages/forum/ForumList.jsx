import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SearchForum from '@/components/forum/SearchForum';
import { Plus, MessageSquare, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ForumList = () => {
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDiscussions();
  }, [searchTerm]);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('discussions')
        .select(`
          *,
          user:users(full_name),
          discussion_replies(count)
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDiscussions(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Community Forum</h1>
           <p className="text-muted-foreground">Join the conversation, ask questions, and share knowledge.</p>
        </div>
        <Button asChild size="lg">
           <Link to="/forum/create">
             <Plus className="mr-2 h-4 w-4" /> Start Discussion
           </Link>
        </Button>
      </div>

      <div className="mb-8">
        <SearchForum onSearch={setSearchTerm} />
      </div>

      <div className="space-y-4">
        {loading ? (
            <div className="space-y-4">
               {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
            </div>
        ) : discussions.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-semibold">No discussions found</h3>
                <p className="text-muted-foreground">Be the first to start a conversation!</p>
            </div>
        ) : (
            discussions.map(disc => (
              <Card key={disc.id} className="hover:border-primary/50 transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-grow">
                      <div className="flex items-center gap-2">
                        <Link to={`/forum/discussion/${disc.id}`} className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1">
                           {disc.title}
                        </Link>
                        {disc.is_resolved && (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolved
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-muted-foreground line-clamp-2 text-sm pr-4">
                        {disc.content}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
                         <span className="font-medium text-foreground">
                            {disc.user?.full_name || 'Anonymous'}
                         </span>
                         <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(new Date(disc.created_at), { addSuffix: true })}
                         </span>
                         <span className="flex items-center">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {disc.discussion_replies?.[0]?.count || 0} Replies
                         </span>
                      </div>
                    </div>
                    
                    <div className="hidden md:flex flex-col items-end justify-center min-w-[100px] border-l pl-4 h-full">
                         <div className="text-2xl font-bold text-primary/80">
                            {disc.discussion_replies?.[0]?.count || 0}
                         </div>
                         <div className="text-xs text-muted-foreground uppercase tracking-wider">Replies</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
};

export default ForumList;