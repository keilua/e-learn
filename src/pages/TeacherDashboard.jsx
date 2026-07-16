import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    PlusCircle, Users, BookOpen, BarChart3, TrendingUp, MoreVertical, Settings, Heart 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    totalRevenue: 0,
    averageRating: 4.8
  });

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
        // Fetch courses with counts
        const { data: coursesData, error } = await supabase
            .from('courses')
            .select(`
                *,
                course_enrollments(count)
            `)
            .eq('instructor_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        setCourses(coursesData);

        // Fetch donations for revenue
        const { data: donations } = await supabase
            .from('donations')
            .select('amount')
            .eq('recipient_id', user.id);
        
        const totalDonations = (donations || []).reduce((acc, curr) => acc + Number(curr.amount), 0);

        // Compute global stats
        const totalStudents = coursesData.reduce((acc, c) => acc + (c.course_enrollments?.[0]?.count || 0), 0);
        const activeCourses = coursesData.filter(c => c.is_published).length;

        setGlobalStats(prev => ({ 
            ...prev, 
            totalStudents, 
            activeCourses,
            totalRevenue: totalDonations
        }));

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Teacher Dashboard | Crow Educ</title>
      </Helmet>

      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
           <p className="text-muted-foreground">Overview of your teaching activities.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link to="/dashboard/teacher/donations">
                    <Heart className="mr-2 h-4 w-4 text-red-500" /> Donations
                </Link>
            </Button>
            <Button asChild>
                <Link to="/courses/create">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Course
                </Link>
            </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.activeCourses}</div>
            <p className="text-xs text-muted-foreground">Out of {courses.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Donations)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{globalStats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Quizzes to grade</p>
          </CardContent>
        </Card>
      </div>

      {/* Courses Grid */}
      <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
            [1,2,3].map(i => <Skeleton key={i} className="h-64 w-full" />)
        ) : courses.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-muted/20 rounded-lg border border-dashed">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-2 font-medium">No courses yet</h3>
                <p className="text-muted-foreground mb-4">Create your first course to see it here.</p>
                <Button asChild variant="outline">
                    <Link to="/courses/create">Create Course</Link>
                </Button>
            </div>
        ) : (
            courses.map(course => (
                <Card key={course.id} className="flex flex-col hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="line-clamp-1 text-lg">
                                    <Link to={`/dashboard/teacher/courses/${course.id}`} className="hover:underline">
                                        {course.title}
                                    </Link>
                                </CardTitle>
                                <CardDescription className="mt-1 flex items-center gap-2">
                                    <Badge variant={course.is_published ? "default" : "secondary"}>
                                        {course.is_published ? 'Published' : 'Draft'}
                                    </Badge>
                                    <span className="text-xs">
                                        {course.course_enrollments?.[0]?.count || 0} Students
                                    </span>
                                </CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link to={`/dashboard/teacher/courses/${course.id}`}>Overview</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to={`/dashboard/teacher/courses/${course.id}/settings`}>Edit Details</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to={`/dashboard/teacher/courses/${course.id}/analytics`}>Analytics</Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt="Course thumbnail" className="w-full h-32 object-cover rounded-md mb-4" />
                        ) : (
                            <div className="w-full h-32 bg-muted rounded-md mb-4 flex items-center justify-center text-muted-foreground">
                                No Image
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <Button variant="outline" size="sm" className="w-full" asChild>
                                <Link to={`/dashboard/teacher/courses/${course.id}`}>
                                    Manage
                                </Link>
                            </Button>
                            <Button variant="ghost" size="sm" className="w-full" asChild>
                                <Link to={`/dashboard/teacher/courses/${course.id}/settings`}>
                                    <Settings className="mr-2 h-3 w-3" /> Settings
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;