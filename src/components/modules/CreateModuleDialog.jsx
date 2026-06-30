import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CreateModuleDialog = ({ open, onOpenChange, courseId, onSuccess }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Get highest order_index
            const { data: existingModules } = await supabase
                .from('modules')
                .select('order_index')
                .eq('course_id', courseId)
                .order('order_index', { ascending: false })
                .limit(1);
            
            const nextIndex = existingModules?.[0] ? existingModules[0].order_index + 1 : 0;

            const { error } = await supabase
                .from('modules')
                .insert([{
                    ...formData,
                    course_id: courseId,
                    order_index: nextIndex,
                    duration_minutes: 0 // Will be calculated dynamically usually
                }]);

            if (error) throw error;

            toast({ title: "Success", description: "Chapter created successfully" });
            setFormData({ title: '', description: '' });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Chapter</DialogTitle>
                    <DialogDescription>
                        Create a new chapter to organize your course content.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Chapter Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Introduction to Hooks"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief overview of this chapter..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Chapter
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateModuleDialog;