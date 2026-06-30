import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, GripVertical, Trash2, Edit, ChevronDown, ChevronRight, FileText, Video, Code, File } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CreateModuleDialog from '@/components/modules/CreateModuleDialog';

const EditCourse = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [course, setCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModuleOpen, setIsCreateModuleOpen] = useState(false);

    useEffect(() => {
        fetchCourseData();
    }, [courseId]);

    const fetchCourseData = async () => {
        try {
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('*')
                .eq('id', courseId)
                .single();
            
            if (courseError) throw courseError;
            setCourse(courseData);

            fetchModules();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Could not load course." });
        } finally {
            setLoading(false);
        }
    };

    const fetchModules = async () => {
        const { data: modulesData, error: modulesError } = await supabase
            .from('modules')
            .select(`
                *,
                lessons (*),
                quizzes (*)
            `)
            .eq('course_id', courseId)
            .order('order_index', { ascending: true });
        
        if (modulesError) {
             console.error("Error fetching modules:", modulesError);
        } else {
             // Sort nested items
             const sortedModules = modulesData.map(m => ({
                 ...m,
                 lessons: m.lessons?.sort((a, b) => a.order_index - b.order_index) || [],
                 quizzes: m.quizzes || []
             }));
             setModules(sortedModules);
        }
    };

    const handleDeleteModule = async (moduleId) => {
        try {
            const { error } = await supabase.from('modules').delete().eq('id', moduleId);
            if (error) throw error;
            setModules(prev => prev.filter(m => m.id !== moduleId));
            toast({ title: "Chapter deleted" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const handleDeleteLesson = async (lessonId) => {
         try {
            const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
            if (error) throw error;
            await fetchModules(); // Refresh to update list
            toast({ title: "Content deleted" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8" /></div>;

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">{course.title}</h1>
                    <p className="text-muted-foreground">Manage course structure and content</p>
                </div>
                <div className="flex gap-2">
                     <Button variant="outline" onClick={() => navigate(`/dashboard/teacher/courses/${courseId}`)}>
                        Done
                     </Button>
                </div>
            </div>

            <div className="grid gap-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Course Chapters</h2>
                    <Button onClick={() => setIsCreateModuleOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Chapter
                    </Button>
                </div>

                {modules.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                            <p className="text-muted-foreground mb-4">No chapters yet. Start by adding one!</p>
                            <Button onClick={() => setIsCreateModuleOpen(true)}>Create First Chapter</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {modules.map((module, index) => (
                            <Card key={module.id} className="overflow-hidden">
                                <CardHeader className="bg-muted/30 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background border text-sm font-medium text-muted-foreground">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <CardTitle className="text-lg">{module.title}</CardTitle>
                                                {module.description && <CardDescription>{module.description}</CardDescription>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/teacher/modules/${module.id}/edit`)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Chapter?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete this chapter and all its lessons and quizzes.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteModule(module.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {/* Lessons List */}
                                        {module.lessons.map((lesson) => (
                                            <div key={lesson.id} className="flex items-center justify-between p-4 pl-12 hover:bg-muted/10 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    {lesson.type === 'video' && <Video className="h-4 w-4 text-blue-500" />}
                                                    {lesson.type === 'text' && <FileText className="h-4 w-4 text-orange-500" />}
                                                    {lesson.type === 'pdf' && <File className="h-4 w-4 text-red-500" />}
                                                    {lesson.type === 'code' && <Code className="h-4 w-4 text-green-500" />}
                                                    <span className="text-sm font-medium">{lesson.title}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                     <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/teacher/modules/${module.id}/lessons/${lesson.id}/edit`)}>
                                                        Edit
                                                     </Button>
                                                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => handleDeleteLesson(lesson.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Quizzes List */}
                                        {module.quizzes.map((quiz) => (
                                             <div key={quiz.id} className="flex items-center justify-between p-4 pl-12 hover:bg-muted/10 transition-colors bg-slate-50/50">
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Quiz</span>
                                                    <span className="text-sm font-medium">{quiz.title}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                     <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/teacher/quizzes/${quiz.id}/edit`)}>
                                                        Edit
                                                     </Button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Add Content Buttons */}
                                        <div className="p-3 bg-muted/10 flex gap-2 justify-end">
                                            <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(`/dashboard/teacher/modules/${module.id}/lessons/create`)}>
                                                <Plus className="mr-1 h-3 w-3" /> Add Content
                                            </Button>
                                             <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(`/dashboard/teacher/modules/${module.id}/quizzes/create`)}>
                                                <Plus className="mr-1 h-3 w-3" /> Add Quiz
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <CreateModuleDialog 
                open={isCreateModuleOpen} 
                onOpenChange={setIsCreateModuleOpen}
                courseId={courseId}
                onSuccess={fetchModules}
            />
        </div>
    );
};

export default EditCourse;