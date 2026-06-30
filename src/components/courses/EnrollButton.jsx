import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const EnrollButton = ({ courseId, onEnrollSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkEnrollment = async () => {
      if (!user) {
        if (mounted) setChecking(false);
        return;
      }

      try {
        // Use maybeSingle() to efficiently check for existence without errors
        const { data, error } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
           console.error('Error checking enrollment:', error);
           // Don't show toast here to avoid spamming user on page load
        } else if (data) {
           if (mounted) setIsEnrolled(true);
        }
      } catch (error) {
        console.error('Error checking enrollment:', error);
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkEnrollment();
    
    return () => { mounted = false; };
  }, [courseId, user]);

  const handleEnroll = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please login to enroll in courses.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Generate a UUID for the new enrollment to ensure NOT NULL constraint is met
      const enrollmentId = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('course_enrollments')
        .insert([
          { 
            id: enrollmentId,
            course_id: courseId, 
            user_id: user.id,
            status: 'active', // Using 'active' to match expected Enum
            enrollment_date: now,
            progress_percentage: 0
          }
        ]);

      if (error) throw error;

      setIsEnrolled(true);
      toast({
        title: "Successfully enrolled!",
        description: "You can now start learning.",
      });
      
      if (onEnrollSuccess) onEnrollSuccess();

    } catch (error) {
      console.error("Enrollment error details:", error);
      let errorMessage = "Could not enroll in course. Please try again.";
      
      if (error.message?.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your connection.";
      }

      toast({
        title: "Enrollment failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
      return <Button disabled variant="outline" className="w-full md:w-auto"><Loader2 className="h-4 w-4 animate-spin" /></Button>;
  }

  if (isEnrolled) {
    return <Button disabled variant="secondary" className="w-full md:w-auto">Enrolled</Button>;
  }

  return (
    <Button 
      onClick={handleEnroll} 
      disabled={loading}
      className="w-full md:w-auto"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
      Enroll Now
    </Button>
  );
};

export default EnrollButton;