import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, User, BarChart } from 'lucide-react';

const CourseCard = ({ course, viewMode = 'grid' }) => {
  const isList = viewMode === 'list';

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow duration-300 flex ${isList ? 'flex-row h-48' : 'flex-col h-full'}`}>
      <div className={`relative ${isList ? 'w-1/3' : 'w-full h-48'}`}>
        {course.thumbnail_url ? (
          <img 
            src={course.thumbnail_url} 
            alt={course.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute top-2 right-2">
           <Badge variant={course.is_published ? "default" : "secondary"}>
             {course.is_published ? 'Published' : 'Draft'}
           </Badge>
        </div>
      </div>
      
      <div className={`flex flex-col ${isList ? 'w-2/3 p-2' : ''}`}>
        <CardHeader className={`${isList ? 'p-4 pb-2' : 'p-4'}`}>
          <div className="flex justify-between items-start">
             <Badge variant="outline" className="mb-2 w-fit">{course.level || 'Beginner'}</Badge>
             {course.price > 0 ? (
                 <span className="font-bold text-lg">${course.price}</span>
             ) : (
                 <span className="font-bold text-lg text-green-600">Free</span>
             )}
          </div>
          <h3 className="font-bold text-xl line-clamp-2 hover:text-primary transition-colors">
            <Link to={`/courses/${course.id}`}>{course.title}</Link>
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <User className="h-3 w-3" /> 
            {course.instructor?.full_name || 'Unknown Instructor'}
          </p>
        </CardHeader>
        
        <CardContent className={`${isList ? 'p-4 pt-0 flex-grow' : 'p-4 pt-0 flex-grow'}`}>
           <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
             {course.description || 'No description provided.'}
           </p>
           
           <div className="flex items-center gap-4 text-xs text-muted-foreground">
             <div className="flex items-center gap-1">
               <Clock className="h-3 w-3" />
               <span>{course.duration_hours || 0}h</span>
             </div>
             <div className="flex items-center gap-1">
                <BarChart className="h-3 w-3" />
                <span>{course.level || 'All Levels'}</span>
             </div>
           </div>
        </CardContent>
        
        <CardFooter className={`${isList ? 'p-4 pt-0' : 'p-4'} flex justify-between items-center mt-auto`}>
          <Link to={`/courses/${course.id}`} className="w-full">
            <Button variant="secondary" className="w-full">View Details</Button>
          </Link>
        </CardFooter>
      </div>
    </Card>
  );
};

export default CourseCard;