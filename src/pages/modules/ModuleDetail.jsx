import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, CheckCircle, Lock, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import ProgressBar from '@/components/modules/ProgressBar';

const ModuleDetail = () => {
  const { courseId, moduleId } = useParams();
  const { user } = useAuth();
  const [module, setModule] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch module info
            const { data: moduleData, error: moduleError } = await supabase
                .from('modules')
                .select('*, courses(title)')
                .eq('id', moduleId)
                .single();
            
            if (moduleError) throw moduleError;
            setModule(moduleData);

            // Fetch lessons with progress
            const { data: lessonsData, error: lessonsError } = await supabase
                .from('lessons')
                .select(`
                    *,
                    lesson_progress(is_completed)
                `)
                .eq('module_id', moduleId)
                .order('order_index', { ascending: true });

            if (lessonsError) throw lessonsError;

            // Normalize lessons data
            const formattedLessons = lessonsData.map(lesson => ({
                ...lesson,
                is_completed: lesson.lesson_progress?.[0]?.is_completed || false
            }));

            setLessons(formattedLessons);

            // Calculate progress
            const completedCount = formattedLessons.filter(l => l.is_completed).length;
            const totalCount = formattedLessons.length;
            setProgress(totalCount > 0 ? (completedCount / totalCount) * 100 : 0);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (user) fetchData();
  }, [moduleId, user]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8" /></div>;
  if (!module) return <div>Module not found</div>;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Helmet>
        <title>{module.title} | {module.courses?.title}</title>
      </Helmet>

      <div className="mb-6">
        <Link to={`/courses/${courseId}`} className="text-sm text-muted-foreground hover:text-primary flex items-center mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Course
        </Link>
        <div className="flex items-center justify-between mb-2">
            <Badge variant="outline">Module {module.order_index + 1}</Badge>
            <span className="text-sm text-muted-foreground">{module.duration_minutes || 0} mins</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
        <p className="text-muted-foreground mb-6">{module.description}</p>
        
        <Card className="mb-8">
            <CardContent className="pt-6">
                <ProgressBar value={progress} showLabel />
            </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Lessons</h2>
        {lessons.length > 0 ? (
            lessons.map((lesson, idx) => (
                <div 
                    key={lesson.id} 
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow group"
                >
                    <div className="flex-shrink-0">
                        {lesson.is_completed ? (
                            <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                            <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-xs font-medium text-muted-foreground">
                                {idx + 1}
                            </div>
                        )}
                    </div>
                    <div className="flex-grow min-w-0">
                        <h3 className="font-medium text-base truncate group-hover:text-primary transition-colors">
                           <Link to={`/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`} className="absolute inset-0 z-10" />
                           {lesson.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                                {lesson.type === 'video' ? <PlayCircle className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                {lesson.type === 'video' ? 'Video' : 'Reading'}
                            </span>
                            {lesson.duration_minutes > 0 && <span>• {lesson.duration_minutes} min</span>}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="z-20">
                        <PlayCircle className="h-5 w-5 opacity-50 group-hover:opacity-100" />
                    </Button>
                </div>
            ))
        ) : (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No lessons added yet.
            </div>
        )}
      </div>
    </div>
  );
};

export default ModuleDetail;