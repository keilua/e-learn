import React from 'react';
import BadgeCard from './BadgeCard';
import { Award } from 'lucide-react';

const BadgeGallery = ({ userBadges = [], allBadges = [] }) => {
  if (userBadges.length === 0 && allBadges.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
        <Award className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-semibold">No Badges Yet</h3>
        <p className="text-muted-foreground">Complete quizzes to earn your first badge!</p>
      </div>
    );
  }

  // If showing earned badges
  if (userBadges.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {userBadges.map((ub) => (
          <BadgeCard 
            key={ub.id}
            badge={ub.badge}
            earnedAt={ub.earned_at}
            quizTitle={ub.badge?.quiz?.title}
          />
        ))}
      </div>
    );
  }

  // If showing available badges (e.g. on a course page)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {allBadges.map((badge) => (
        <BadgeCard 
          key={badge.id}
          badge={badge}
          quizTitle={badge.quiz?.title}
        />
      ))}
    </div>
  );
};

export default BadgeGallery;