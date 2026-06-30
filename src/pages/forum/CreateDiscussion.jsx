import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

const CreateDiscussion = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    course_id: 'general' // Default to 'general' or specific ID
  });

  useEffect(() => {
    if (user) {
        fetchEnrolledCourses();
    }
  }, [user]);

  const fetchEnrolledCourses = async () => {
      const { data } = await supabase
        .from('course_enrollments')
        .select('course:courses(id, title)')
        .eq('user_id', user.id);
      
      if (data) {
          setCourses(data.map(e => e.course));
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const discussionData = {
          title: formData.title,
          content: formData.content,
          user_id: user.id,
      };

      if (formData.course_id && formData.course_id !== 'general') {
          discussionData.course_id = formData.course_id;
      }

      const { data, error } = await supabase
        .from('discussions')
        .insert([discussionData])
        .select()
        .single();

      if (error) throw error;

      // Notify Instructor Logic
      if (discussionData.course_id) {
          const { data: course } = await supabase
            .from('courses')
            .select('instructor_id')
            .eq('id', discussionData.course_id)
            .single();
          
          if (course && course.instructor_id !== user.id) {
             await supabase.from('notifications').insert({
                 user_id: course.instructor_id,
                 sender_id: user.id,
                 type: 'discussion',
                 reference_id: data.id,
                 message: `New discussion in your course: "${formData.title}"`
             });
          }
      }

      toast({ title: "Success", description: "Discussion started successfully!" });
      navigate(`/forum/discussion/${data.id}`);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl py-10 px-4">
      <Button variant="ghost" onClick={() => navigate('/forum')} className="mb-6 pl-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Forum
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Start a New Discussion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="course">Related Course (Optional)</Label>
              <Select 
                value={formData.course_id} 
                onValueChange={(val) => setFormData({...formData, course_id: val})}
              >
                <SelectTrigger>
                    <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="general">General Discussion</SelectItem>
                    {courses.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="What's on your mind?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Provide more details..."
                className="min-h-[200px]"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/forum')}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post Discussion
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateDiscussion;