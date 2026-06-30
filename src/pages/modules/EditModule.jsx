import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Plus, GripVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const EditModule = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', duration_minutes: '' });
    const [lessons, setLessons] = useState([]);

    useEffect(() => {
        fetchModuleData();
    }, [moduleId]);

    const fetchModuleData = async () => {
        try {
            const { data: moduleData, error: modError } = await supabase
                .from('modules')
                .select('*')
                .eq('id', moduleId)
                .single();
            
            if (modError) throw modError;
            setFormData({
                title: moduleData.title,
                description: moduleData.description,
                duration_minutes: moduleData.duration_minutes
            });

            const { data: lessonsData, error: lessonError } = await supabase
                .from('lessons')
                .select('*')
                .eq('module_id', moduleId)
                .order('order_index', { ascending: true });
            
            if (lessonError) throw lessonError;
            setLessons(lessonsData || []);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error loading module" });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('modules')
                .update(formData)
                .eq('id', moduleId);
            
            if (error) throw error;
            toast({ title: "Saved", description: "Module updated successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error saving" });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLesson = async (id) => {
        if(!window.confirm("Delete this lesson?")) return;
        try {
            const { error } = await supabase.from('lessons').delete().eq('id', id);
            if(error) throw error;
            setLessons(prev => prev.filter(l => l.id !== id));
            toast({ title: "Lesson deleted" });
        } catch(e) {
            toast({ variant: "destructive", title: "Error deleting lesson" });
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container max-w-4xl py-10 px-4">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Edit Module</h1>
                <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Module Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                                </div>
                                <Button type="submit" disabled={saving} className="w-full">
                                    {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                    Save Details
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Lessons</h2>
                        <Button size="sm" asChild>
                            <Link to={`/dashboard/teacher/modules/${moduleId}/lessons/create`}>
                                <Plus className="mr-2 h-4 w-4" /> Add Lesson
                            </Link>
                        </Button>
                    </div>
                    
                    <div className="space-y-2">
                        {lessons.map((lesson, idx) => (
                            <div key={lesson.id} className="flex items-center gap-3 p-3 bg-card border rounded-md">
                                <GripVertical className="text-muted-foreground h-5 w-5 cursor-move" />
                                <div className="flex-grow">
                                    <div className="font-medium">{lesson.title}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{lesson.type} • {lesson.duration_minutes} min</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link to={`/dashboard/teacher/modules/${moduleId}/lessons/${lesson.id}/edit`}>Edit</Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteLesson(lesson.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {lessons.length === 0 && <p className="text-muted-foreground text-center py-4">No lessons yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditModule;