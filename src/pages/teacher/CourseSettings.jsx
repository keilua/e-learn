import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

const CourseSettings = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
      title: '',
      description: '',
      thumbnail_url: '',
      is_published: false,
      price: 0
  });

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
        const { data } = await supabase.from('courses').select('*').eq('id', courseId).single();
        if (data) {
            setFormData({
                title: data.title,
                description: data.description || '',
                thumbnail_url: data.thumbnail_url || '',
                is_published: data.is_published,
                price: data.price || 0
            });
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const handleChange = (e) => {
      const { id, value } = e.target;
      setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked) => {
      setFormData(prev => ({ ...prev, is_published: checked }));
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setSaving(true);
      try {
          const { error } = await supabase
            .from('courses')
            .update({
                ...formData,
                updated_at: new Date()
            })
            .eq('id', courseId);
          
          if (error) throw error;
          
          toast({ title: "Settings saved successfully" });
      } catch (error) {
          toast({ variant: "destructive", title: "Error saving settings", description: error.message });
      } finally {
          setSaving(false);
      }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Button variant="ghost" asChild className="mb-6 pl-0">
         <Link to={`/dashboard/teacher/courses/${courseId}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Overview</Link>
      </Button>

      <form onSubmit={handleSubmit}>
        <Card>
            <CardHeader>
                <CardTitle>Course Settings</CardTitle>
                <CardDescription>Manage general information and visibility.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="title">Course Title</Label>
                    <Input id="title" value={formData.title} onChange={handleChange} required />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={formData.description} onChange={handleChange} className="min-h-[120px]" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                    <Input id="thumbnail_url" value={formData.thumbnail_url} onChange={handleChange} placeholder="https://..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input id="price" type="number" min="0" value={formData.price} onChange={handleChange} />
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                    <div className="space-y-0.5">
                        <Label className="text-base">Publish Course</Label>
                        <p className="text-sm text-muted-foreground">Make this course visible to students.</p>
                    </div>
                    <Switch checked={formData.is_published} onCheckedChange={handleSwitchChange} />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
            </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default CourseSettings;