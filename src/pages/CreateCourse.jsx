import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CreateCourse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'beginner', // Initialize with lowercase to match DB constraint
    price: '',
    duration_hours: '',
    thumbnail_url: '',
    is_published: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value, name) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, is_published: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            ...formData,
            instructor_id: user.id,
            price: formData.price ? parseFloat(formData.price) : 0,
            duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : 0,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Course created!",
        description: "Your course has been successfully created.",
      });
      
      navigate(`/dashboard/teacher`);
    } catch (error) {
      console.error("Error creating course:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create course. Please check your inputs.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <Helmet>
        <title>Create Course | EduPlatform</title>
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Course</h1>
        <p className="text-muted-foreground">Fill in the details to create a new course.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 border p-6 rounded-lg bg-card">
        <div className="space-y-2">
          <Label htmlFor="title">Course Title</Label>
          <Input 
            id="title" 
            name="title" 
            value={formData.title} 
            onChange={handleChange} 
            required 
            placeholder="e.g. Introduction to React"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description" 
            name="description" 
            value={formData.description} 
            onChange={handleChange} 
            rows={4}
            placeholder="What will students learn in this course?"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Select 
              value={formData.level} 
              onValueChange={(val) => handleSelectChange(val, 'level')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {/* Values must be lowercase to match database constraint */}
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration_hours">Duration (Hours)</Label>
            <Input 
              id="duration_hours" 
              name="duration_hours" 
              type="number" 
              min="0"
              value={formData.duration_hours} 
              onChange={handleChange} 
              placeholder="e.g. 10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price ($)</Label>
            <Input 
              id="price" 
              name="price" 
              type="number" 
              min="0" 
              step="0.01"
              value={formData.price} 
              onChange={handleChange} 
              placeholder="0.00 for free"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
            <Input 
              id="thumbnail_url" 
              name="thumbnail_url" 
              value={formData.thumbnail_url} 
              onChange={handleChange} 
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Switch 
            id="is_published" 
            checked={formData.is_published}
            onCheckedChange={handleSwitchChange}
          />
          <Label htmlFor="is_published">Publish immediately</Label>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="ghost" onClick={() => navigate('/dashboard/teacher')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Course
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateCourse;