import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, Plus, Trash2, Award } from 'lucide-react';
import QuestionForm from '@/components/quizzes/QuestionForm';

const EditQuiz = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [quizData, setQuizData] = useState({
        title: '',
        description: '',
        passing_score: 70,
        time_limit_minutes: 30
    });
    const [questions, setQuestions] = useState([]);
    const [isEditingQuestion, setIsEditingQuestion] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(null);

    useEffect(() => {
        fetchQuizData();
    }, [quizId]);

    const fetchQuizData = async () => {
        try {
            // Fetch Quiz
            const { data: quiz, error: qError } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', quizId)
                .single();
            
            if (qError) throw qError;
            setQuizData(quiz);

            // Fetch Questions
            const { data: qs, error: qsError } = await supabase
                .from('questions')
                .select('*, answers(*)')
                .eq('quiz_id', quizId)
                .order('order_index', { ascending: true });
            
            if (qsError) throw qsError;
            setQuestions(qs);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Could not load quiz." });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateQuiz = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('quizzes')
                .update({
                    title: quizData.title,
                    description: quizData.description,
                    passing_score: quizData.passing_score,
                    time_limit_minutes: quizData.time_limit_minutes,
                    updated_at: new Date()
                })
                .eq('id', quizId);

            if (error) throw error;
            toast({ title: "Quiz updated successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const handleSaveQuestion = async (formData) => {
        try {
            let questionId;

            // 1. Upsert Question
            const questionPayload = {
                quiz_id: quizId,
                question_text: formData.question_text,
                question_type: formData.question_type,
                points: formData.points,
                order_index: formData.order_index !== undefined ? formData.order_index : questions.length,
                updated_at: new Date()
            };

            if (currentQuestion?.id) {
                // Update
                const { error } = await supabase
                    .from('questions')
                    .update(questionPayload)
                    .eq('id', currentQuestion.id);
                if (error) throw error;
                questionId = currentQuestion.id;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('questions')
                    .insert(questionPayload)
                    .select()
                    .single();
                if (error) throw error;
                questionId = data.id;
            }

            // 2. Handle Answers
            // Delete existing answers for this question if updating
            if (currentQuestion?.id) {
                const { error: delError } = await supabase
                    .from('answers')
                    .delete()
                    .eq('question_id', questionId);
                if (delError) throw delError;
            }

            // Insert new answers
            const answersPayload = formData.answers.map((a, idx) => ({
                question_id: questionId,
                answer_text: a.answer_text,
                is_correct: a.is_correct,
                order_index: idx
            }));

            if (answersPayload.length > 0) {
                const { error: ansError } = await supabase
                    .from('answers')
                    .insert(answersPayload);
                if (ansError) throw ansError;
            }

            toast({ title: "Question saved successfully" });
            setIsEditingQuestion(false);
            fetchQuizData();

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error saving question", description: error.message });
        }
    };

    const handleDeleteQuestion = async (id) => {
        if (!window.confirm("Delete this question?")) return;
        try {
            const { error } = await supabase.from('questions').delete().eq('id', id);
            if (error) throw error;
            setQuestions(prev => prev.filter(q => q.id !== id));
            toast({ title: "Question deleted" });
        } catch (error) {
            toast({ variant: "destructive", title: "Delete failed" });
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container max-w-4xl py-10 px-4">
            <div className="flex justify-between items-center mb-6">
                <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                
                {/* Badge Creation Link */}
                <Button variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-50" asChild>
                    <Link to={`/dashboard/teacher/quizzes/${quizId}/create-badge`}>
                        <Award className="mr-2 h-4 w-4" /> Create/Edit Badge
                    </Link>
                </Button>
            </div>

            <div className="grid gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Quiz Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateQuiz} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input 
                                    id="title" 
                                    value={quizData.title} 
                                    onChange={(e) => setQuizData({...quizData, title: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desc">Description</Label>
                                <Textarea 
                                    id="desc" 
                                    value={quizData.description} 
                                    onChange={(e) => setQuizData({...quizData, description: e.target.value})} 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Passing Score (%)</Label>
                                    <Input 
                                        type="number" 
                                        value={quizData.passing_score} 
                                        onChange={(e) => setQuizData({...quizData, passing_score: parseInt(e.target.value)})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Time Limit (Minutes)</Label>
                                    <Input 
                                        type="number" 
                                        value={quizData.time_limit_minutes} 
                                        onChange={(e) => setQuizData({...quizData, time_limit_minutes: parseInt(e.target.value)})} 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit">Save Changes</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Questions ({questions.length})</CardTitle>
                        <Button onClick={() => { setCurrentQuestion(null); setIsEditingQuestion(true); }}>
                            <Plus className="mr-2 h-4 w-4" /> Add Question
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {isEditingQuestion ? (
                            <QuestionForm 
                                question={currentQuestion}
                                onCancel={() => setIsEditingQuestion(false)}
                                onSave={handleSaveQuestion}
                            />
                        ) : (
                            <div className="space-y-4">
                                {questions.map((q, idx) => (
                                    <div key={q.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                        <div className="space-y-1">
                                            <div className="font-medium">
                                                <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                                                {q.question_text}
                                            </div>
                                            <div className="text-xs text-muted-foreground capitalize">
                                                {q.question_type.replace('_', ' ')} • {q.points} pts
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => { setCurrentQuestion(q); setIsEditingQuestion(true); }}>
                                                Edit
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {questions.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No questions yet. Click "Add Question" to start.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default EditQuiz;