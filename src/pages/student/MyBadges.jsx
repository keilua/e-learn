import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/customSupabaseClient';
import BadgeGallery from '@/components/badges/BadgeGallery';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const MyBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('user_badges')
          .select(`
            id,
            earned_at,
            badge:badges (
              id,
              name,
              description,
              image_url,
              quiz:quizzes (title)
            )
          `)
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false });

        if (error) throw error;
        setBadges(data || []);
      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [user]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Helmet>
        <title>My Badges | Crow Educ</title>
      </Helmet>

      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" asChild size="icon">
           <Link to="/dashboard/student"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
           <h1 className="text-3xl font-bold">My Badges</h1>
           <p className="text-muted-foreground">Achievements unlocked through your learning journey.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : (
        <BadgeGallery userBadges={badges} />
      )}
    </div>
  );
};

export default MyBadges;