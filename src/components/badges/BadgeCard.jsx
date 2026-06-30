import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Award, Star } from 'lucide-react';

const BadgeCard = ({ badge, earnedAt, quizTitle }) => {
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-primary/10 group">
      <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center p-2 shadow-inner group-hover:scale-105 transition-transform duration-300">
          <div className="absolute inset-0 rounded-full border-4 border-white/50"></div>
          {badge.image_url ? (
            <img 
              src={badge.image_url} 
              alt={badge.name} 
              className="w-full h-full object-cover rounded-full shadow-sm"
            />
          ) : (
            <Award className="w-16 h-16 text-amber-500 drop-shadow-sm" />
          )}
          {earnedAt && (
             <div className="absolute -bottom-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center">
               <Star className="w-3 h-3 mr-1 fill-white" /> EARNED
             </div>
          )}
        </div>
        
        <div>
          <h3 className="font-bold text-lg text-slate-800 group-hover:text-primary transition-colors">{badge.name}</h3>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
            {badge.description}
          </p>
        </div>

        <div className="w-full pt-4 border-t text-xs text-muted-foreground space-y-1">
          {quizTitle && (
            <div className="font-medium">Passed: {quizTitle}</div>
          )}
          {earnedAt ? (
            <div>Awarded on {format(new Date(earnedAt), 'MMM dd, yyyy')}</div>
          ) : (
            <div className="text-amber-600 font-medium">Locked</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BadgeCard;