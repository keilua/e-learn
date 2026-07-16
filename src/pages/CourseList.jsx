import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import CourseCard from '@/components/courses/CourseCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutGrid, List, Search, Filter, SlidersHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterInstructor, setFilterInstructor] = useState('all');
  const [instructors, setInstructors] = useState([]);

  useEffect(() => {
    fetchCourses();
    fetchInstructors();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('courses')
        .select(`
          *,
          instructor:instructor_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('is_published', true);

      const { data, error } = await query;

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
      try {
          const { data, error } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('role', 'instructor'); // Assuming role-based logic or filtering users who have courses
          
          if(!error && data) {
              setInstructors(data);
          }
      } catch (e) {
          console.error("Error fetching instructors", e);
      }
  };


  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInstructor = filterInstructor === 'all' || course.instructor_id === filterInstructor;
    
    return matchesSearch && matchesInstructor;
  });

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
      <Helmet>
        <title>All Courses | Crow Educ</title>
        <meta name="description" content="Browse our wide selection of courses" />
      </Helmet>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Browse Courses</h1>
          <p className="text-muted-foreground mt-1">
            Discover {courses.length} courses to enhance your skills
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Instructor</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem 
                checked={filterInstructor === 'all'}
                onCheckedChange={() => setFilterInstructor('all')}
              >
                All Instructors
              </DropdownMenuCheckboxItem>
              {instructors.map((inst) => (
                  <DropdownMenuCheckboxItem
                    key={inst.id}
                    checked={filterInstructor === inst.id}
                    onCheckedChange={() => setFilterInstructor(inst.id)}
                  >
                    {inst.full_name || 'Unknown'}
                  </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex bg-muted rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="px-3"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="px-3"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "flex flex-col gap-4"
        }>
          {filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} viewMode={viewMode} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">No courses found</h2>
          <p className="text-muted-foreground mt-2">
            Try adjusting your search or filters to find what you're looking for.
          </p>
          <Button 
            variant="link" 
            onClick={() => {setSearchQuery(''); setFilterInstructor('all');}}
            className="mt-2"
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default CourseList;