import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, BookOpen, MessageSquare, Award, ArrowRight, Settings, BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

const CourseOverview = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    completionRate: 0,
    avgQuizScore: 0,
    forumParticipation: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    setLoading(true);
    try {
        // Fetch Course Details
        const { data: courseData } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();
        
        setCourse(courseData);

        // 1. Total Students
        const { count: studentCount } = await supabase
            .from('course_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', courseId);

        // 2. Completion Rate
        const { count: completedCount } = await supabase
            .from('course_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', courseId)
            .eq('status', 'completed');

        // 3. Average Quiz Score (approximate via fetching all attempts for related quizzes is expensive, 
        // normally use an RPC function, doing simplified here)
        // Fetch all modules IDs first
        const { data: modules } = await supabase.from('modules').select('id').eq('course_id', courseId);
        const moduleIds = modules.map(m => m.id);
        
        let avgScore = 0;
        if (moduleIds.length > 0) {
            const { data: attempts } = await supabase
                .from('quiz_attempts')
                .select('score, max_score, quiz:quizzes!inner(module_id)')
                .in('quiz.module_id', moduleIds);
            
            if (attempts && attempts.length > 0) {
                const totalPct = attempts.reduce((acc, curr) => acc + (curr.score / curr.max_score), 0);
                avgScore = Math.round((totalPct / attempts.length) * 100);
            }
        }

        // 4. Forum Participation (Simplification: just getting raw discussion count linked to course if any)
        const { count: discussionCount } = await supabase
            .from('discussions')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', courseId);


        setStats({
            totalStudents: studentCount || 0,
            completionRate: studentCount ? Math.round((completedCount / studentCount) * 100) : 0,
            avgQuizScore: avgScore,
            forumParticipation: discussionCount || 0
        });

    } catch (error) {
        console.error("Error loading course stats", error);
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3"/><Skeleton className="h-64 w-full"/></div>;
  if (!course) return <div>Course not found</div>;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold">{course.title}</h1>
           <p className="text-muted-foreground">{course.description ? course.description.substring(0, 100) + '...' : 'Manage your course'}</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link to={`/courses/${courseId}/edit`}>
                    <Settings className="mr-2 h-4 w-4" /> Edit Content
                </Link>
            </Button>
            <Button asChild>
                <Link to={`/dashboard/teacher/courses/${courseId}/analytics`}>
                    <BarChart2 className="mr-2 h-4 w-4" /> Analytics
                </Link>
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate}%</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg. Quiz Score</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.avgQuizScore}%</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Discussions</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.forumParticipation}</div>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-primary" />
                        <div>
                            <div className="font-medium">Manage Students</div>
                            <div className="text-sm text-muted-foreground">View progress and grades</div>
                        </div>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                        <Link to={`/dashboard/teacher/courses/${courseId}/students`}>View <ArrowRight className="ml-2 h-4 w-4"/></Link>
                    </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-primary" />
                        <div>
                            <div className="font-medium">Course Settings</div>
                            <div className="text-sm text-muted-foreground">Update info, price, publishing</div>
                        </div>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                        <Link to={`/dashboard/teacher/courses/${courseId}/settings`}>Edit <ArrowRight className="ml-2 h-4 w-4"/></Link>
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest enrollments and submissions</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground text-center py-8">
                    Activity feed requires additional backend events tracking.
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourseOverview;