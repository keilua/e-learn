import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Mail, Award } from 'lucide-react';

const StudentDetail = () => {
  const { courseId, studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, [studentId, courseId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
        // Fetch User Info
        const { data: userData } = await supabase.from('users').select('*').eq('id', studentId).single();
        setStudent(userData);

        // Fetch Enrollment
        const { data: enrollData } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('course_id', courseId)
            .eq('user_id', studentId)
            .single();
        setEnrollment(enrollData);

        // Fetch Quiz Attempts for this course (needs module lookup)
        const { data: modules } = await supabase.from('modules').select('id').eq('course_id', courseId);
        const moduleIds = modules.map(m => m.id);

        if (moduleIds.length > 0) {
            const { data: attempts } = await supabase
                .from('quiz_attempts')
                .select('*, quiz:quizzes!inner(title, module_id)')
                .in('quiz.module_id', moduleIds)
                .eq('user_id', studentId)
                .order('created_at', { ascending: false });
            
            setQuizAttempts(attempts || []);
        }

    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" asChild className="mb-6 pl-0">
         <Link to={`/dashboard/teacher/courses/${courseId}/students`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Student List</Link>
      </Button>

      {/* Header Profile */}
      <Card className="mb-8">
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
                <AvatarImage src={student?.avatar_url} />
                <AvatarFallback className="text-2xl">{student?.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-grow text-center md:text-left">
                <h1 className="text-3xl font-bold">{student?.full_name}</h1>
                <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
                    <Mail className="h-4 w-4" /> {student?.email}
                </p>
            </div>
            <div className="w-full md:w-1/3 space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Course Progress</span>
                    <span className="font-bold">{enrollment?.progress_percentage}%</span>
                </div>
                <Progress value={enrollment?.progress_percentage || 0} />
                <div className="text-xs text-muted-foreground text-right">
                    Status: <span className="capitalize">{enrollment?.status}</span>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Quiz Performance</CardTitle>
            </CardHeader>
            <CardContent>
                {quizAttempts.length === 0 ? (
                    <p className="text-muted-foreground">No quizzes taken yet.</p>
                ) : (
                    <div className="space-y-4">
                        {quizAttempts.map((attempt) => (
                            <div key={attempt.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                <div>
                                    <div className="font-medium">{attempt.quiz?.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(attempt.completed_at || attempt.started_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">
                                        {attempt.score} / {attempt.max_score}
                                    </div>
                                    <div className={`text-xs ${attempt.is_passed ? 'text-green-600' : 'text-red-600'}`}>
                                        {attempt.is_passed ? 'Passed' : 'Failed'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Participation</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium">Forum Posts</span>
                        <span className="font-bold">0</span> {/* Requires discussion filtering */}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium">Certificates Earned</span>
                        <span className="font-bold">{enrollment?.status === 'completed' ? 1 : 0}</span>
                    </div>
               </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDetail;