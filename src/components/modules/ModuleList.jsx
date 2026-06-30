import React from 'react';
import ModuleCard from './ModuleCard';
import { Card, CardContent } from '@/components/ui/card';

const ModuleList = ({ modules, isInstructor = false, courseId }) => {
  if (!modules || modules.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No modules available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {modules.map((module) => (
        <ModuleCard 
          key={module.id} 
          module={module} 
          courseId={courseId}
          isInstructor={isInstructor}
          progress={module.progress || 0} 
        />
      ))}
    </div>
  );
};

export default ModuleList;