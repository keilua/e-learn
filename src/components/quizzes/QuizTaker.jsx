import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import QuestionDisplay from './QuestionDisplay';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const QuizTaker = ({ quiz, questions, onSubmit }) => {
  const { toast } = useToast();
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit_minutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleTimeUp = () => {
    toast({
      title: "Time's up!",
      description: "Submitting your quiz automatically.",
      variant: "destructive"
    });
    handleSubmit();
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await onSubmit(answers);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((quiz.time_limit_minutes * 60 - timeLeft) / (quiz.time_limit_minutes * 60)) * 100;
  const isLowTime = timeLeft < 60; // Less than 1 minute

  return (
    <div className="space-y-8">
      <div className="sticky top-20 z-10 bg-background/95 backdrop-blur py-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">{quiz.title}</h2>
          <div className={`flex items-center gap-2 font-mono text-xl font-bold ${isLowTime ? 'text-destructive animate-pulse' : 'text-primary'}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
        <Progress value={100 - progress} className={`h-2 ${isLowTime ? 'bg-destructive/20' : ''}`} />
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => (
          <QuestionDisplay 
            key={q.id}
            index={idx}
            question={q}
            answer={answers[q.id]}
            onChange={handleAnswerChange}
          />
        ))}
      </div>

      <div className="flex justify-end pt-6 pb-20">
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size="lg" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to submit your quiz. You cannot change your answers after this.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit}>Yes, Submit</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default QuizTaker;