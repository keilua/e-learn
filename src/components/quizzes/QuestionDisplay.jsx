import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const QuestionDisplay = ({ question, answer, onChange, index }) => {
  const handleChange = (value) => {
    onChange(question.id, value);
  };

  const renderInput = () => {
    switch (question.question_type) {
      case 'single_choice':
      case 'true_false':
        return (
          <RadioGroup 
            value={answer || ''} 
            onValueChange={handleChange}
            className="space-y-3"
          >
            {question.answers?.map((opt) => (
              <div key={opt.id} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={opt.id} id={opt.id} />
                <Label htmlFor={opt.id} className="flex-grow cursor-pointer">{opt.answer_text}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.answers?.map((opt) => {
              const checked = Array.isArray(answer) && answer.includes(opt.id);
              return (
                <div key={opt.id} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors">
                  <Checkbox 
                    id={opt.id} 
                    checked={checked}
                    onCheckedChange={(isChecked) => {
                      const current = Array.isArray(answer) ? [...answer] : [];
                      if (isChecked) {
                        handleChange([...current, opt.id]);
                      } else {
                        handleChange(current.filter(id => id !== opt.id));
                      }
                    }}
                  />
                  <Label htmlFor={opt.id} className="flex-grow cursor-pointer font-normal">{opt.answer_text}</Label>
                </div>
              );
            })}
          </div>
        );

      case 'short_answer':
        return (
          <Input 
            value={answer || ''} 
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Type your answer here..."
            className="max-w-md"
          />
        );

      default:
        return <p className="text-red-500">Unknown question type</p>;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
            <CardTitle className="text-lg font-medium">
               <span className="text-muted-foreground mr-2">{index + 1}.</span> 
               {question.question_text}
            </CardTitle>
            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap bg-secondary px-2 py-1 rounded">
               {question.points} points
            </span>
        </div>
      </CardHeader>
      <CardContent>
        {renderInput()}
      </CardContent>
    </Card>
  );
};

export default QuestionDisplay;