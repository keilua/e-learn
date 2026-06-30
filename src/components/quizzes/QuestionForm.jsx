import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const QuestionForm = ({ question, onSave, onDelete, onCancel }) => {
  const [formData, setFormData] = useState(question || {
    question_text: '',
    question_type: 'single_choice',
    points: 10,
    answers: [
        { answer_text: '', is_correct: false },
        { answer_text: '', is_correct: false }
    ]
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAnswerChange = (idx, field, value) => {
    const newAnswers = [...formData.answers];
    
    // Logic for single choice - only one can be correct
    if (field === 'is_correct' && value === true && (formData.question_type === 'single_choice' || formData.question_type === 'true_false')) {
         newAnswers.forEach(a => a.is_correct = false);
    }
    
    newAnswers[idx] = { ...newAnswers[idx], [field]: value };
    setFormData(prev => ({ ...prev, answers: newAnswers }));
  };

  const addAnswer = () => {
    setFormData(prev => ({
        ...prev,
        answers: [...prev.answers, { answer_text: '', is_correct: false }]
    }));
  };

  const removeAnswer = (idx) => {
    if (formData.answers.length <= 2) return; // Minimum 2 options
    const newAnswers = formData.answers.filter((_, i) => i !== idx);
    setFormData(prev => ({ ...prev, answers: newAnswers }));
  };

  const handleTypeChange = (type) => {
      let defaultAnswers = formData.answers;
      if (type === 'true_false') {
          defaultAnswers = [
              { answer_text: 'True', is_correct: true },
              { answer_text: 'False', is_correct: false }
          ];
      } else if (type === 'short_answer') {
          defaultAnswers = [{ answer_text: '', is_correct: true }]; // Used as the accepted answer key
      } else if (formData.question_type === 'true_false' || formData.question_type === 'short_answer') {
          // Reset to default empty options if switching back from T/F
          defaultAnswers = [
              { answer_text: '', is_correct: false },
              { answer_text: '', is_correct: false }
          ];
      }
      
      setFormData(prev => ({
          ...prev,
          question_type: type,
          answers: defaultAnswers
      }));
  };

  return (
    <Card className="border-l-4 border-l-primary mb-4">
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
                <Label>Question Text</Label>
                <Textarea 
                    value={formData.question_text}
                    onChange={(e) => handleChange('question_text', e.target.value)}
                    placeholder="Enter your question here..."
                    required
                />
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.question_type} onValueChange={handleTypeChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="single_choice">Single Choice</SelectItem>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="true_false">True / False</SelectItem>
                            <SelectItem value="short_answer">Short Answer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Points</Label>
                    <Input 
                        type="number" 
                        min="1"
                        value={formData.points}
                        onChange={(e) => handleChange('points', parseInt(e.target.value) || 0)}
                    />
                </div>
            </div>
        </div>

        <div className="space-y-3 pt-2">
            <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">
                {formData.question_type === 'short_answer' ? 'Accepted Answers' : 'Answer Options'}
            </Label>
            
            {formData.answers.map((answer, idx) => (
                <div key={idx} className="flex items-center gap-3">
                    {formData.question_type !== 'short_answer' && (
                         <div className="flex items-center justify-center pt-2">
                             <Switch 
                                checked={answer.is_correct}
                                onCheckedChange={(c) => handleAnswerChange(idx, 'is_correct', c)}
                                title="Mark as correct"
                             />
                         </div>
                    )}
                    <Input 
                        value={answer.answer_text}
                        onChange={(e) => handleAnswerChange(idx, 'answer_text', e.target.value)}
                        placeholder={formData.question_type === 'short_answer' ? 'Enter acceptable answer...' : `Option ${idx + 1}`}
                        className="flex-grow"
                        disabled={formData.question_type === 'true_false'} // Fixed text for T/F
                    />
                    {formData.question_type !== 'true_false' && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeAnswer(idx)}
                            disabled={formData.answers.length <= 1}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ))}
            
            {formData.question_type !== 'true_false' && (
                <Button variant="outline" size="sm" onClick={addAnswer} className="mt-2">
                    <Plus className="h-3 w-3 mr-1" /> Add Option
                </Button>
            )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSave(formData)}>
                {question ? 'Update Question' : 'Add Question'}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionForm;