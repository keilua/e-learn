import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { searchService } from '@/services/SearchService';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { History, Trash2, Search, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const SearchHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const data = await searchService.getHistory(user.id);
      setHistory(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await searchService.clearHistory(user.id);
      setHistory([]);
      toast({ title: "History Cleared", description: "Your search history has been deleted." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Could not clear history." });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" asChild>
             <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
           </Button>
           <h1 className="text-2xl font-bold flex items-center gap-2">
             <History className="h-6 w-6" /> Search History
           </h1>
        </div>
        
        {history.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleClearHistory}>
            <Trash2 className="mr-2 h-4 w-4" /> Clear All
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Search className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p>No search history found.</p>
              <p className="text-sm mt-1">Your recent searches will appear here.</p>
            </div>
          ) : (
            <div className="divide-y">
              {history.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center group">
                  <Link to={`/search?q=${encodeURIComponent(item.query)}`} className="flex-grow flex items-center gap-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium group-hover:text-primary transition-colors">{item.query}</span>
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchHistory;