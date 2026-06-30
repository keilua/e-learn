import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, Award } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CreateBadge = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: ''
  });

  const badgeTemplates = [
    "https://cdn-icons-png.flaticon.com/512/3176/3176294.png", 
    "https://cdn-icons-png.flaticon.com/512/625/625393.png",   
    "https://cdn-icons-png.flaticon.com/512/2617/2617942.png", 
    "https://cdn-icons-png.flaticon.com/512/3076/3076442.png"  
  ];

  useEffect(() => {
    const fetchQuiz = async () => {
      const { data } = await supabase.from('quizzes').select('title').eq('id', quizId).single();
      if (data) setQuizTitle(data.title);
    };
    fetchQuiz();
  }, [quizId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('badges')
        .insert({
          quiz_id: quizId,
          name: formData.name,
          description: formData.description,
          image_url: formData.image_url
        });

      if (error) throw error;

      toast({ title: "Badge created successfully!" });
      navigate(-1);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10 px-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quiz
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Create Badge for "{quizTitle}"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Badge Name</Label>
              <Input
                id="name"
                placeholder="e.g., Master of Physics"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Congratulations on passing the quiz! You have demonstrated..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>

            <div className="space-y-4">
              <Label>Badge Icon</Label>
              <div className="flex gap-4 mb-4">
                {badgeTemplates.map((url) => (
                  <div 
                    key={url}
                    onClick={() => setFormData({...formData, image_url: url})}
                    className={`cursor-pointer p-2 border-2 rounded-lg hover:bg-muted ${formData.image_url === url ? 'border-primary bg-primary/10' : 'border-transparent'}`}
                  >
                    <img src={url} alt="Badge template" className="w-12 h-12 object-contain" />
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                  <Input 
                    placeholder="Or paste custom image URL" 
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    required
                  />
              </div>
              {formData.image_url && (
                  <div className="mt-2 text-center p-4 border rounded bg-muted/20">
                      <p className="text-xs text-muted-foreground mb-2">Preview</p>
                      <img src={formData.image_url} alt="Preview" className="w-24 h-24 object-contain mx-auto" />
                  </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Badge
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateBadge;