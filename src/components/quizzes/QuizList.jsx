import React from 'react';
import QuizCard from './QuizCard';

const QuizList = ({ quizzes, courseId, moduleId, isInstructor = false, attempts = [] }) => {
  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
        <p className="text-muted-foreground">No quizzes available for this module.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {quizzes.map((quiz) => {
        // Find latest attempt for this quiz if student
        const attempt = attempts.find(a => a.quiz_id === quiz.id);
        
        return (
          <QuizCard 
            key={quiz.id} 
            quiz={quiz} 
            courseId={courseId}
            moduleId={moduleId}
            isInstructor={isInstructor}
            attempt={attempt}
          />
        );
      })}
    </div>
  );
};

export default QuizList;