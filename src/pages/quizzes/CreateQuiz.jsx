import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const CreateQuiz = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        time_limit_minutes: 30,
        passing_score: 70
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('quizzes')
                .insert([{
                    ...formData,
                    module_id: moduleId,
                    time_limit_minutes: parseInt(formData.time_limit_minutes),
                    passing_score: parseInt(formData.passing_score)
                }])
                .select()
                .single();

            if (error) throw error;

            toast({ title: "Success", description: "Quiz created successfully" });
            navigate(`/dashboard/teacher/quizzes/${data.id}/edit`);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container max-w-2xl py-10 px-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Module
            </Button>
            <h1 className="text-3xl font-bold mb-6">Create New Quiz</h1>
            
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Quiz Title</Label>
                            <Input 
                                id="title" 
                                value={formData.title} 
                                onChange={e => setFormData({...formData, title: e.target.value})} 
                                required 
                                placeholder="e.g. Module 1 Final Assessment"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea 
                                id="description" 
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})} 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="time">Time Limit (minutes)</Label>
                                <Input 
                                    id="time" 
                                    type="number"
                                    min="1"
                                    value={formData.time_limit_minutes} 
                                    onChange={e => setFormData({...formData, time_limit_minutes: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="score">Passing Score (%)</Label>
                                <Input 
                                    id="score" 
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formData.passing_score} 
                                    onChange={e => setFormData({...formData, passing_score: e.target.value})} 
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                            Create Quiz & Add Questions
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateQuiz;