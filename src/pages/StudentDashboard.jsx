import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PlayCircle, Award, BookOpen, Trophy, FileBadge, ChevronRight } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats] = useState({ badges: 0, certificates: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Enrollments
      const { data: enrollmentData } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          course:course_id (
            id,
            title,
            thumbnail_url,
            duration_hours,
            instructor:instructor_id(full_name)
          )
        `)
        .eq('user_id', user.id);
      
      setEnrollments(enrollmentData || []);

      // Fetch Badges Count
      const { count: badgesCount } = await supabase
        .from('user_badges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch Certificates Count
      // We filter certificates by the enrollment IDs we just fetched
      let certCount = 0;
      if (enrollmentData && enrollmentData.length > 0) {
          const enrollmentIds = enrollmentData.map(e => e.id);
          const { count } = await supabase
            .from('certificates')
            .select('id', { count: 'exact', head: true })
            .in('enrollment_id', enrollmentIds);
          certCount = count || 0;
      }

      setStats({
          badges: badgesCount || 0,
          certificates: certCount
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>My Learning | EduPlatform</title>
      </Helmet>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold">My Learning</h1>
           <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || 'Student'}!</p>
        </div>
        
        <div className="flex gap-2">
           <Button asChild>
             <Link to="/courses">Browse Courses</Link>
           </Button>
        </div>
      </div>

      {/* Achievement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-100">
              <CardContent className="p-6 flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium text-orange-600 mb-1">Badges Earned</p>
                      <h3 className="text-3xl font-bold text-slate-800">{stats.badges}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      <Trophy className="h-6 w-6" />
                  </div>
              </CardContent>
              <div className="px-6 pb-4">
                  <Link to="/dashboard/student/badges" className="text-sm text-orange-600 font-medium hover:underline flex items-center">
                      View all badges <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
              </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-100">
              <CardContent className="p-6 flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium text-indigo-600 mb-1">Certificates</p>
                      <h3 className="text-3xl font-bold text-slate-800">{stats.certificates}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <FileBadge className="h-6 w-6" />
                  </div>
              </CardContent>
              <div className="px-6 pb-4">
                  <Link to="/dashboard/student/certificates" className="text-sm text-indigo-600 font-medium hover:underline flex items-center">
                      View certificates <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
              </div>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-rose-100">
              <CardContent className="p-6 flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium text-rose-600 mb-1">Active Courses</p>
                      <h3 className="text-3xl font-bold text-slate-800">
                          {enrollments.filter(e => e.status !== 'completed').length}
                      </h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                      <BookOpen className="h-6 w-6" />
                  </div>
              </CardContent>
              <div className="px-6 pb-4">
                  <span className="text-sm text-rose-600/70">Keep learning!</span>
              </div>
          </Card>
      </div>

      <h2 className="text-xl font-bold mb-4">My Courses</h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1,2,3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-lg"></div>)}
        </div>
      ) : enrollments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id} className="flex flex-col h-full hover:shadow-md transition-shadow group">
              <div className="h-40 w-full bg-muted relative overflow-hidden rounded-t-lg">
                {enrollment.course?.thumbnail_url ? (
                  <img 
                    src={enrollment.course.thumbnail_url} 
                    alt={enrollment.course.title} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <PlayCircle className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                )}
                {enrollment.status === 'completed' && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center">
                        <Award className="h-3 w-3 mr-1" /> Completed
                    </div>
                )}
              </div>
              <CardContent className="flex flex-col flex-grow p-4">
                 <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {enrollment.course?.title}
                 </h3>
                 <p className="text-sm text-muted-foreground mb-4">
                    {enrollment.course?.instructor?.full_name}
                 </p>
                 
                 <div className="mt-auto space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                       <span>{enrollment.progress_percentage || 0}% Complete</span>
                    </div>
                    <Progress value={enrollment.progress_percentage || 0} className="h-2" />
                    
                    <Link to={`/courses/${enrollment.course_id}`}>
                        <Button className="w-full mt-4" variant={enrollment.status === 'completed' ? 'secondary' : 'default'}>
                            {enrollment.status === 'completed' ? 'Review Course' : 'Continue Learning'}
                        </Button>
                    </Link>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
             <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">You haven't enrolled in any courses yet</h2>
          <p className="text-muted-foreground mt-2 mb-6">Explore our catalog and start learning today!</p>
          <Link to="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;