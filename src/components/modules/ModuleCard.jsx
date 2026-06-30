import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, ChevronRight } from 'lucide-react';
import ProgressBar from '@/components/modules/ProgressBar';

const ModuleCard = ({ module, progress = 0, isInstructor = false, courseId }) => {
  const isCompleted = progress === 100;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
              Module {module.order_index + 1}
            </div>
            <CardTitle className="text-xl">
              <Link 
                to={isInstructor ? `/dashboard/teacher/modules/${module.id}/edit` : `/courses/${courseId}/modules/${module.id}`}
                className="hover:underline"
              >
                {module.title}
              </Link>
            </CardTitle>
          </div>
          {isCompleted ? (
            <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground/30 shrink-0" />
          )}
        </div>
        <CardDescription className="line-clamp-2">
          {module.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{module.duration_minutes || 0} min</span>
          </div>
          {/* We could add lesson count here if available in join */}
        </div>

        {!isInstructor && (
          <div className="space-y-4">
            <ProgressBar value={progress} />
            <Button className="w-full group" variant={isCompleted ? "outline" : "default"} asChild>
               <Link to={`/courses/${courseId}/modules/${module.id}`}>
                 {isCompleted ? 'Review Module' : 'Continue Module'}
                 <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
               </Link>
            </Button>
          </div>
        )}
        
        {isInstructor && (
           <Button variant="outline" className="w-full" asChild>
             <Link to={`/dashboard/teacher/modules/${module.id}/edit`}>Manage Lessons</Link>
           </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuleCard;