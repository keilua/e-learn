import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, HelpCircle, Trophy, BarChart } from 'lucide-react';

const QuizCard = ({ quiz, courseId, moduleId, isInstructor = false, attempt = null }) => {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl line-clamp-1">{quiz.title}</CardTitle>
          {attempt && (
            <Badge variant={attempt.is_passed ? "default" : "destructive"}>
              {attempt.is_passed ? "Passed" : "Failed"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
          {quiz.description || "No description available."}
        </p>
        
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{quiz.time_limit_minutes} min limit</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            <span>Pass: {quiz.passing_score}%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        {isInstructor ? (
           <div className="flex gap-2 w-full">
             <Button variant="outline" className="flex-1" asChild>
                <Link to={`/dashboard/teacher/quizzes/${quiz.id}/edit`}>Edit Quiz</Link>
             </Button>
             <Button variant="secondary" className="flex-1" asChild>
                <Link to={`/dashboard/teacher/quizzes/${quiz.id}/stats`}>
                  <BarChart className="h-4 w-4 mr-2" /> Stats
                </Link>
             </Button>
           </div>
        ) : (
           <Button className="w-full" variant={attempt ? "outline" : "default"} asChild>
             <Link to={`/courses/${courseId}/modules/${moduleId}/quizzes/${quiz.id}`}>
               {attempt ? "Retake Quiz" : "Start Quiz"}
             </Link>
           </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default QuizCard;