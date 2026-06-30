import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, ChevronRight, CheckCircle, Loader2, Award } from 'lucide-react';
import LessonViewer from '@/components/lessons/LessonViewer';
import QuizCard from '@/components/quizzes/QuizCard';
import { completionService } from '@/services/completionService';
import confetti from 'canvas-confetti';

const LessonPage = () => {
  const { courseId, moduleId, lessonId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nextLesson, setNextLesson] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [showCompletionSuccess, setShowCompletionSuccess] = useState(false);

  useEffect(() => {
    fetchLessonData();
  }, [lessonId, user]);

  const fetchLessonData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current lesson details
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select(`
            *,
            module:modules(
                id,
                title,
                course:courses(id, title)
            )
        `)
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;
      setLesson(lessonData);

      // 2. Check completion status
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('is_completed')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      setIsCompleted(progressData?.is_completed || false);

      // 3. Find next lesson
      const { data: nextInModule } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', moduleId)
        .gt('order_index', lessonData.order_index)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextInModule) {
        setNextLesson({ 
            id: nextInModule.id, 
            moduleId: moduleId,
            label: 'Next Lesson'
        });
      } else {
        const { data: nextModule } = await supabase
            .from('modules')
            .select('id, lessons(id)')
            .eq('course_id', courseId)
            .gt('order_index', lessonData.module.order_index || 0)
            .order('order_index', { ascending: true })
            .limit(1)
            .maybeSingle();
            
         if (nextModule) {
             setNextLesson({
                 moduleId: nextModule.id,
                 label: 'Next Module'
             });
         }
      }

      // 4. Fetch Quizzes for this Module
      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('module_id', moduleId);

      if (quizzesData) {
        setQuizzes(quizzesData);
        if (quizzesData.length > 0) {
            const { data: attempts } = await supabase
                .from('quiz_attempts')
                .select('*')
                .in('quiz_id', quizzesData.map(q => q.id))
                .eq('user_id', user.id);
            setQuizAttempts(attempts || []);
        }
      }

    } catch (error) {
      console.error('Error fetching lesson:', error);
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You may not be enrolled in this course or the lesson is unavailable."
      });
      navigate(`/courses/${courseId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    setMarkingComplete(true);
    try {
        const newStatus = !isCompleted;
        
        const { error } = await supabase
            .from('lesson_progress')
            .upsert({
                user_id: user.id,
                lesson_id: lessonId,
                is_completed: newStatus,
                completed_at: newStatus ? new Date().toISOString() : null,
                last_accessed_at: new Date().toISOString()
            });

        if (error) throw error;
        
        setIsCompleted(newStatus);
        
        if (newStatus) {
            toast({ title: "Lesson completed!" });
            
            // Check for full course completion
            const result = await completionService.checkAndProcessCompletion(user.id, courseId);
            
            if (result.completed && result.newlyCompleted) {
                setShowCompletionSuccess(true);
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                toast({
                    title: "🎉 Course Completed!",
                    description: "You've earned a certificate and a new badge!",
                    duration: 5000,
                });
            }
        }

    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error updating progress" });
    } finally {
        setMarkingComplete(false);
    }
  };

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <Helmet>
        <title>{lesson.title} | {lesson.module?.course?.title}</title>
      </Helmet>

      {/* Completion Banner */}
      {showCompletionSuccess && (
        <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                    <Award className="h-8 w-8 text-yellow-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-yellow-800">Course Completed!</h3>
                    <p className="text-yellow-700">Congratulations! You've earned a Certificate of Completion.</p>
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" className="bg-white" asChild>
                    <Link to="/dashboard/student/certificates">View Certificate</Link>
                </Button>
                <Button asChild className="bg-yellow-600 hover:bg-yellow-700 text-white">
                    <Link to="/dashboard/student/badges">View Badge</Link>
                </Button>
            </div>
        </div>
      )}

      <div className="mb-6">
        <Link 
            to={`/courses/${courseId}/modules/${moduleId}`} 
            className="text-sm text-muted-foreground hover:text-primary flex items-center mb-4 transition-colors"
        >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Module
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold">{lesson.title}</h1>
                <p className="text-muted-foreground mt-1">{lesson.module?.title}</p>
            </div>
            
            <div className="flex items-center gap-3">
                <Button 
                    variant={isCompleted ? "outline" : "default"}
                    onClick={handleToggleComplete}
                    disabled={markingComplete}
                    className={isCompleted ? "border-green-500 text-green-600 hover:text-green-700 hover:bg-green-50" : ""}
                >
                    {markingComplete ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : (
                        isCompleted ? <CheckCircle className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {isCompleted ? "Completed" : "Mark as Complete"}
                </Button>
                
                {nextLesson && (
                    <Button variant="secondary" asChild>
                        <Link to={nextLesson.id 
                            ? `/courses/${courseId}/modules/${nextLesson.moduleId}/lessons/${nextLesson.id}`
                            : `/courses/${courseId}/modules/${nextLesson.moduleId}`
                        }>
                            {nextLesson.label} <ChevronRight className="h-4 w-4 ml-2" />
                        </Link>
                    </Button>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
            <Card>
                <CardContent className="p-0 overflow-hidden min-h-[400px]">
                    <LessonViewer lesson={lesson} />
                </CardContent>
            </Card>

            {/* Quizzes Section */}
            {quizzes.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        Module Quiz {quizzes.length > 1 && `(${quizzes.length})`}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quizzes.map(quiz => (
                            <QuizCard 
                                key={quiz.id}
                                quiz={quiz}
                                courseId={courseId}
                                moduleId={moduleId}
                                attempt={quizAttempts.find(a => a.quiz_id === quiz.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Navigation Footer */}
            <div className="flex justify-between items-center py-8 border-t">
                 <Button variant="ghost" asChild>
                    <Link to={`/courses/${courseId}/modules/${moduleId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Module Overview
                    </Link>
                 </Button>
                 
                 {nextLesson && (
                    <Button asChild>
                        <Link to={nextLesson.id 
                            ? `/courses/${courseId}/modules/${nextLesson.moduleId}/lessons/${nextLesson.id}`
                            : `/courses/${courseId}/modules/${nextLesson.moduleId}`
                        }>
                            Next Lesson <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                 )}
            </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block lg:col-span-1">
             <div className="sticky top-24 border rounded-lg p-4 bg-muted/20">
                 <h3 className="font-semibold mb-4">About this lesson</h3>
                 <div className="space-y-4 text-sm">
                     <div className="flex justify-between py-2 border-b">
                         <span className="text-muted-foreground">Type</span>
                         <span className="font-medium capitalize">{lesson.type || 'Standard'}</span>
                     </div>
                     <div className="flex justify-between py-2 border-b">
                         <span className="text-muted-foreground">Duration</span>
                         <span className="font-medium">{lesson.duration_minutes || 5} min</span>
                     </div>
                     <div className="flex justify-between py-2 border-b">
                         <span className="text-muted-foreground">Status</span>
                         <span className={`font-medium ${isCompleted ? 'text-green-600' : 'text-amber-600'}`}>
                             {isCompleted ? 'Completed' : 'In Progress'}
                         </span>
                     </div>
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default LessonPage;