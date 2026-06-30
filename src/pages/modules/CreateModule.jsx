import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';

const CreateModule = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        duration_minutes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Get highest order_index
            const { data: existingModules } = await supabase
                .from('modules')
                .select('order_index')
                .eq('course_id', courseId)
                .order('order_index', { ascending: false })
                .limit(1);
            
            const nextIndex = existingModules?.[0] ? existingModules[0].order_index + 1 : 0;

            const { error } = await supabase
                .from('modules')
                .insert([{
                    ...formData,
                    course_id: courseId,
                    order_index: nextIndex,
                    duration_minutes: parseInt(formData.duration_minutes) || 0
                }]);

            if (error) throw error;

            toast({ title: "Success", description: "Module created successfully" });
            navigate(`/dashboard/teacher`); // Or back to course edit
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container max-w-2xl py-10 px-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-3xl font-bold mb-6">Create New Module</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6 border p-6 rounded-lg">
                <div className="space-y-2">
                    <Label htmlFor="title">Module Title</Label>
                    <Input 
                        id="title" 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        required 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                        id="description" 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                    <Input 
                        id="duration" 
                        type="number"
                        value={formData.duration_minutes} 
                        onChange={e => setFormData({...formData, duration_minutes: e.target.value})} 
                    />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    Create Module
                </Button>
            </form>
        </div>
    );
};

export default CreateModule;