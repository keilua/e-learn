import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/hooks/useAuth';
import QuizTaker from '@/components/quizzes/QuizTaker';
import QuizResults from '@/components/quizzes/QuizResults';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
                // 1. Get Quiz info
                const { data: quizData, error: qError } = await supabase
                    .from('quizzes')
                    .select('*')
                    .eq('id', quizId)
                    .single();
                if (qError) throw qError;
                setQuiz(quizData);

                // 2. Check for existing attempts
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

                // 3. Get Questions
                const { data: qData, error: qsError } = await supabase
                    .from('questions')
                    .select(`
                        id, 
                        question_text, 
                        question_type, 
                        points, 
                        order_index,
                        answers (id, answer_text) 
                    `)
                    .eq('quiz_id', quizId)
                    .order('order_index', { ascending: true });
                
                if (qsError) throw qsError;
                setQuestions(qData);

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [quizId, user]);

    const checkCourseCompletion = async (currentCourseId) => {
        try {
            // 1. Get all modules for this course
            const { data: modules } = await supabase
                .from('modules')
                .select('id')
                .eq('course_id', currentCourseId);
            
            if (!modules || modules.length === 0) return false;
            const moduleIds = modules.map(m => m.id);

            // 2. Get all quizzes for these modules
            const { data: quizzes } = await supabase
                .from('quizzes')
                .select('id')
                .in('module_id', moduleIds);
            
            // 3. Check if user passed all quizzes
            let allPassed = true;
            
            if (quizzes && quizzes.length > 0) {
                for (const q of quizzes) {
                    const { data: passedAttempts } = await supabase
                        .from('quiz_attempts')
                        .select('id')
                        .eq('quiz_id', q.id)
                        .eq('user_id', user.id)
                        .eq('is_passed', true)
                        .limit(1);
                    
                    if (!passedAttempts || passedAttempts.length === 0) {
                        allPassed = false;
                        break;
                    }
                }
            }

            return allPassed;
        } catch (error) {
            console.error("Completion check error", error);
            return false;
        }
    };

    const awardCertificate = async () => {
        try {
            const enrollmentId = await getEnrollmentId();
            if (!enrollmentId) return;

            // Check if certificate already exists
            const { data: existingCert } = await supabase
                .from('certificates')
                .select('id')
                .eq('enrollment_id', enrollmentId)
                .maybeSingle();

            if (existingCert) return;

            const certNum = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*1000)}`;

            const { error } = await supabase
                .from('certificates')
                .insert({
                    enrollment_id: enrollmentId,
                    certificate_number: certNum,
                    issued_date: new Date().toISOString(),
                    certificate_url: 'generated-on-demand' 
                });
            
            if (!error) {
                toast({
                    title: "🎉 Course Completed!",
                    description: "Congratulations! You have earned a certificate.",
                    duration: 5000
                });
                
                // Update enrollment status
                await supabase
                    .from('course_enrollments')
                    .update({ status: 'completed', completion_date: new Date().toISOString(), progress_percentage: 100 })
                    .eq('id', enrollmentId);
            } else {
                console.error("Certificate insert error:", error);
            }
        } catch (error) {
            console.error('Cert award error', error);
        }
    };

    const getEnrollmentId = async () => {
        const { data } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .eq('user_id', user.id)
            .maybeSingle();
        return data?.id;
    };

    const handleQuizSubmit = async (userAnswers) => {
        setLoading(true);
        try {
            // Grading logic
            const { data: fullQuestions } = await supabase
                .from('questions')
                .select('*, answers(*)')
                .eq('quiz_id', quizId);

            let totalScore = 0;
            let maxScore = 0;

            fullQuestions.forEach(q => {
                maxScore += q.points;
                const correctAnsIds = q.answers.filter(a => a.is_correct).map(a => a.id);
                const userAns = userAnswers[q.id];

                let isCorrect = false;

                if (q.question_type === 'single_choice' || q.question_type === 'true_false') {
                    if (correctAnsIds.includes(userAns)) isCorrect = true;
                } else if (q.question_type === 'multiple_choice') {
                    if (Array.isArray(userAns) && 
                        userAns.length === correctAnsIds.length && 
                        userAns.every(val => correctAnsIds.includes(val))) {
                        isCorrect = true;
                    }
                } else if (q.question_type === 'short_answer') {
                    const acceptable = q.answers.map(a => a.answer_text.toLowerCase().trim());
                    if (acceptable.includes((userAns || '').toLowerCase().trim())) {
                        isCorrect = true;
                    }
                }

                if (isCorrect) totalScore += q.points;
            });

            const isPassed = (totalScore / maxScore) * 100 >= quiz.passing_score;

            // Save Attempt
            const { data: attemptData, error } = await supabase
                .from('quiz_attempts')
                .insert({
                    user_id: user.id,
                    quiz_id: quizId,
                    score: totalScore,
                    max_score: maxScore,
                    is_passed: isPassed,
                    completed_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            setResult(attemptData);

            // ---------------------------------------------------------
            // BADGE & CERTIFICATE LOGIC
            // ---------------------------------------------------------
            if (isPassed) {
                // 1. Check & Award Badge
                const { data: badge } = await supabase
                    .from('badges')
                    .select('id, name')
                    .eq('quiz_id', quizId)
                    .maybeSingle();
                
                if (badge) {
                    const { error: badgeError } = await supabase
                        .from('user_badges')
                        .insert({ user_id: user.id, badge_id: badge.id })
                        .select();

                    if (!badgeError) {
                        toast({
                            title: "🏅 Badge Earned!",
                            description: `You've earned the "${badge.name}" badge!`,
                            duration: 5000,
                            className: "bg-yellow-50 border-yellow-200"
                        });
                    }
                }

                // 2. Check Course Completion for Certificate
                const isCourseComplete = await checkCourseCompletion(courseId);
                if (isCourseComplete) {
                    await awardCertificate();
                }
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