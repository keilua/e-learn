import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const ProgressBar = ({ value, max = 100, className, showLabel = true }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1 text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <Progress value={percentage} className="h-2" />
    </div>
  );
};

export default ProgressBar;