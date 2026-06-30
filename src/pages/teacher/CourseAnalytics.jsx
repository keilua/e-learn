import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PerformanceChart from '@/components/charts/PerformanceChart';

const CourseAnalytics = () => {
  const { courseId } = useParams();
  const [quizData, setQuizData] = useState([]);
  const [enrollmentData, setEnrollmentData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [courseId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
        // 1. Enrollment over time (mocked based on actual enrollments)
        const { data: enrollments } = await supabase
            .from('course_enrollments')
            .select('enrollment_date')
            .eq('course_id', courseId)
            .order('enrollment_date', { ascending: true });

        const enrollmentsByMonth = {};
        enrollments.forEach(e => {
            const month = new Date(e.enrollment_date).toLocaleString('default', { month: 'short' });
            enrollmentsByMonth[month] = (enrollmentsByMonth[month] || 0) + 1;
        });

        const eData = Object.keys(enrollmentsByMonth).map(month => ({
            name: month,
            students: enrollmentsByMonth[month]
        }));
        setEnrollmentData(eData);

        // 2. Quiz Score Distribution
        const { data: modules } = await supabase.from('modules').select('id').eq('course_id', courseId);
        const moduleIds = modules.map(m => m.id);
        
        if (moduleIds.length > 0) {
            const { data: attempts } = await supabase
                .from('quiz_attempts')
                .select('score, max_score, quiz:quizzes!inner(title, module_id)')
                .in('quiz.module_id', moduleIds);
            
            // Average score per quiz
            const scoresByQuiz = {};
            attempts.forEach(a => {
                const title = a.quiz.title;
                if (!scoresByQuiz[title]) scoresByQuiz[title] = { total: 0, count: 0 };
                scoresByQuiz[title].total += (a.score / a.max_score) * 100;
                scoresByQuiz[title].count += 1;
            });

            const qData = Object.keys(scoresByQuiz).map(title => ({
                name: title.length > 15 ? title.substring(0, 15) + '...' : title,
                score: Math.round(scoresByQuiz[title].total / scoresByQuiz[title].count)
            }));
            setQuizData(qData);
        }

    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" asChild className="mb-6 pl-0">
         <Link to={`/dashboard/teacher/courses/${courseId}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Overview</Link>
      </Button>
      
      <h1 className="text-3xl font-bold mb-8">Course Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PerformanceChart 
            title="Student Enrollment Growth"
            description="Number of new students per month"
            data={enrollmentData}
            type="area"
            dataKey="students"
            color="#10b981"
        />

        <PerformanceChart 
            title="Average Quiz Scores"
            description="Performance across different quizzes"
            data={quizData}
            type="bar"
            dataKey="score"
            color="#3b82f6"
        />

        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Engagement Insights</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                    Detailed participation metrics (time spent, video drop-off rates) require additional telemetry data collection.
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourseAnalytics;