import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/hooks/useAuth';
import QuizTaker from '@/components/quizzes/QuizTaker';
import QuizResults from '@/components/quizzes/QuizResults';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { quizService } from '@/services/quizService';

const QuizPage = () => {
    const { courseId, moduleId, quizId } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                // 1. Quiz et questions, sans le corrigé
                const { quiz: quizData, questions: qData } = await quizService.getQuizForAttempt(quizId);
                setQuiz(quizData);
                setQuestions(qData);

                // 2. Dernière tentative éventuelle
                const { data: attempts } = await supabase
                    .from('quiz_attempts')
                    .select('*')
                    .eq('quiz_id', quizId)
                    .eq('user_id', user.id)
                    .order('completed_at', { ascending: false })
                    .limit(1);
                
                if (attempts && attempts.length > 0) {
                     setResult(attempts[0]);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [quizId, user]);

    const handleQuizSubmit = async (userAnswers) => {
        setLoading(true);
        try {
            // Notation, badge et certificat sont gérés par le serveur (SEC-008).
            const { attempt, badge, completion } = await quizService.submitQuizAttempt(quizId, userAnswers);
            setResult(attempt);

            if (badge) {
                toast({
                    title: "🏅 Badge Earned!",
                    description: `You've earned the "${badge.name}" badge!`,
                    duration: 5000,
                    className: "bg-yellow-50 border-yellow-200"
                });
            }

            if (completion?.newlyCompleted) {
                toast({
                    title: "🎉 Course Completed!",
                    description: "Congratulations! You have earned a certificate.",
                    duration: 5000
                });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Submission Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (result) {
        return <QuizResults result={result} courseId={courseId} moduleId={moduleId} />;
    }

    return (
        <div className="container max-w-3xl mx-auto py-8 px-4">
            <QuizTaker 
                quiz={quiz} 
                questions={questions} 
                onSubmit={handleQuizSubmit} 
            />
        </div>
    );
};

export default QuizPage;