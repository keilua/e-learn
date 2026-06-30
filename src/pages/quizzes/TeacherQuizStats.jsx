import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, CheckCircle, Clock } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

const TeacherQuizStats = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ attempts: [], avgScore: 0, passRate: 0, totalAttempts: 0 });
    const [quizTitle, setQuizTitle] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            const { data: quiz } = await supabase.from('quizzes').select('title').eq('id', quizId).single();
            if (quiz) setQuizTitle(quiz.title);

            const { data: attempts } = await supabase
                .from('quiz_attempts')
                .select('*, user:users(full_name, email)')
                .eq('quiz_id', quizId)
                .order('created_at', { ascending: false });

            if (attempts && attempts.length > 0) {
                const total = attempts.length;
                const passed = attempts.filter(a => a.is_passed).length;
                const totalScore = attempts.reduce((acc, curr) => acc + (curr.score / curr.max_score * 100), 0);
                
                setStats({
                    attempts,
                    avgScore: Math.round(totalScore / total),
                    passRate: Math.round((passed / total) * 100),
                    totalAttempts: total
                });
            }
        };
        fetchStats();
    }, [quizId]);

    return (
        <div className="container py-10 px-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            
            <h1 className="text-3xl font-bold mb-8">Stats: {quizTitle}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalAttempts}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgScore}%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.passRate}%</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Attempts</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.attempts.map((attempt) => (
                                <TableRow key={attempt.id}>
                                    <TableCell>
                                        <div className="font-medium">{attempt.user?.full_name}</div>
                                        <div className="text-xs text-muted-foreground">{attempt.user?.email}</div>
                                    </TableCell>
                                    <TableCell>{new Date(attempt.completed_at || attempt.started_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{attempt.score} / {attempt.max_score} ({Math.round(attempt.score/attempt.max_score*100)}%)</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${attempt.is_passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {attempt.is_passed ? 'Passed' : 'Failed'}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default TeacherQuizStats;