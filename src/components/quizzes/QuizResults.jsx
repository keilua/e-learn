import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css'; // You'd normally need to install this or add custom css, but we'll simulate

const QuizResults = ({ result, courseId, moduleId }) => {
  const percentage = Math.round((result.score / result.max_score) * 100);
  const passed = result.is_passed;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <Card className="text-center overflow-hidden">
        <div className={`h-3 w-full ${passed ? 'bg-green-500' : 'bg-red-500'}`} />
        <CardHeader>
          <CardTitle className="text-3xl">
            {passed ? 'Congratulations!' : 'Keep Trying!'}
          </CardTitle>
          <p className="text-muted-foreground">
            {passed ? 'You have passed this quiz.' : 'You did not reach the passing score.'}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-8">
            <div className="w-48 h-48">
                {/* Visual representation of score */}
                <div className="relative w-full h-full rounded-full border-8 border-muted flex items-center justify-center">
                    <div className="text-center">
                        <span className="text-4xl font-bold block">{percentage}%</span>
                        <span className="text-sm text-muted-foreground">Score</span>
                    </div>
                    {/* Simple overlay for color */}
                    <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 100 100">
                         <circle 
                            cx="50" cy="50" r="46" 
                            fill="none" 
                            stroke={passed ? "currentColor" : "currentColor"} 
                            strokeWidth="8"
                            strokeDasharray={`${percentage * 2.89} 289`}
                            className={passed ? "text-green-500" : "text-red-500"}
                         />
                    </svg>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 w-full max-w-sm">
                <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground mb-1">Your Score</span>
                    <span className="text-2xl font-bold">{result.score} / {result.max_score}</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground mb-1">Status</span>
                    <div className={`flex items-center gap-1 font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                        {passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        {passed ? 'PASSED' : 'FAILED'}
                    </div>
                </div>
            </div>

            <div className="pt-4">
                <Button size="lg" asChild>
                    <Link to={`/courses/${courseId}/modules/${moduleId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Module
                    </Link>
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizResults;