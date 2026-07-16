import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import EnrollButton from '@/components/courses/EnrollButton';
import DonationButton from '@/components/donations/DonationButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Clock, 
  BookOpen, 
  User, 
  PlayCircle, 
  CheckCircle, 
  Lock,
  Calendar,
  BarChart,
  ChevronRight
} from 'lucide-react';

const CourseDetail = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    setLoading(true);
    try {
      // Fetch course info
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:instructor_id (
            id,
            full_name,
            bio,
            avatar_url
          )
        `)
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch modules with lessons to allow deep linking
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          lessons (
            id,
            title,
            order_index
          )
        `)
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

    } catch (error) {
      console.error('Error fetching course details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 min-h-screen flex items-center justify-center">
         <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto py-10 px-4 min-h-screen text-center">
        <h2 className="text-2xl font-bold">Course not found</h2>
        <Link to="/courses">
           <Button variant="link" className="mt-4">Back to Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
      <Helmet>
        <title>{course.title} | Crow Educ</title>
        <meta name="description" content={course.description || `Details for course ${course.title}`} />
      </Helmet>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Course Content */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <Badge className="mb-4">{course.level || 'All Levels'}</Badge>
            <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
            <p className="text-xl text-muted-foreground mb-6">
              {course.description}
            </p>
            
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Created by <span className="font-semibold text-foreground">{course.instructor?.full_name}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Last updated {new Date(course.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="modules" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="modules">Curriculum</TabsTrigger>
              <TabsTrigger value="instructor">Instructor</TabsTrigger>
            </TabsList>
            <TabsContent value="modules" className="mt-6 space-y-4">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Course Content</h3>
                  <span className="text-sm text-muted-foreground">{modules.length} modules • {course.duration_hours || 0}h total length</span>
               </div>
               
               {modules.length > 0 ? (
                 <div className="border rounded-lg divide-y">
                   {modules.map((module, index) => {
                     // Determine link destination: First lesson or Module detail
                     const sortedLessons = module.lessons?.sort((a,b) => (a.order_index || 0) - (b.order_index || 0)) || [];
                     const firstLesson = sortedLessons[0];
                     const linkTo = firstLesson 
                        ? `/courses/${courseId}/modules/${module.id}/lessons/${firstLesson.id}`
                        : `/courses/${courseId}/modules/${module.id}`;
                     
                     return (
                       <Link 
                         to={linkTo}
                         key={module.id} 
                         className="group block p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors cursor-pointer"
                       >
                         <div className="flex-shrink-0 mt-1">
                            <PlayCircle className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                         </div>
                         <div className="flex-grow">
                           <h4 className="font-medium text-base group-hover:text-primary transition-colors">
                              {index + 1}. {module.title}
                           </h4>
                           {module.description && (
                             <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                           )}
                         </div>
                         <div className="flex flex-col items-end gap-1">
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {module.duration_minutes ? `${module.duration_minutes} min` : ''}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors" />
                         </div>
                       </Link>
                     );
                   })}
                 </div>
               ) : (
                 <div className="text-center p-8 border rounded-lg border-dashed">
                   <p className="text-muted-foreground">No content available for this course yet.</p>
                 </div>
               )}
            </TabsContent>
            <TabsContent value="instructor" className="mt-6">
               <Card>
                 <CardHeader className="flex flex-row items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold overflow-hidden">
                       {course.instructor?.avatar_url ? (
                         <img src={course.instructor.avatar_url} alt={course.instructor.full_name} className="h-full w-full object-cover" />
                       ) : (
                         course.instructor?.full_name?.charAt(0) || 'I'
                       )}
                    </div>
                    <div>
                      <CardTitle>{course.instructor?.full_name}</CardTitle>
                      <CardDescription>Instructor</CardDescription>
                    </div>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground mb-4">
                     {course.instructor?.bio || "No bio available for this instructor."}
                   </p>
                   {course.instructor && (
                     <DonationButton 
                       recipientId={course.instructor.id}
                       recipientName={course.instructor.full_name}
                       variant="outline"
                       label="Support this Instructor"
                       className="w-full sm:w-auto"
                     />
                   )}
                 </CardContent>
               </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Enrollment Card */}
        <div className="lg:col-span-1">
           <Card className="sticky top-24">
             <div className="aspect-video w-full bg-muted relative overflow-hidden rounded-t-lg">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors cursor-pointer">
                   <PlayCircle className="h-16 w-16 text-white drop-shadow-lg opacity-80" />
                </div>
             </div>
             
             <CardContent className="p-6 space-y-6">
               <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold">
                   {course.price > 0 ? `$${course.price}` : 'Free'}
                 </span>
                 {course.price > 0 && (
                   <span className="text-muted-foreground line-through text-sm mb-1 opacity-70">
                     ${(Number(course.price) * 1.2).toFixed(2)}
                   </span>
                 )}
               </div>

               <EnrollButton courseId={course.id} />

               <div className="space-y-4 pt-4">
                 <h4 className="font-semibold text-sm">This course includes:</h4>
                 <ul className="space-y-2 text-sm">
                   <li className="flex items-center gap-2">
                     <Clock className="h-4 w-4 text-muted-foreground" />
                     <span>{course.duration_hours || 0} hours of on-demand video</span>
                   </li>
                   <li className="flex items-center gap-2">
                     <BookOpen className="h-4 w-4 text-muted-foreground" />
                     <span>{modules.length} modules</span>
                   </li>
                   <li className="flex items-center gap-2">
                     <BarChart className="h-4 w-4 text-muted-foreground" />
                     <span>Level: {course.level || 'All Levels'}</span>
                   </li>
                   <li className="flex items-center gap-2">
                     <CheckCircle className="h-4 w-4 text-muted-foreground" />
                     <span>Certificate of completion</span>
                   </li>
                 </ul>
               </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;