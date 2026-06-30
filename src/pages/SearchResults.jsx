import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { searchService } from '@/services/SearchService';
import SearchFilters from '@/components/search/SearchFilters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, User, MessageSquare, ArrowRight, Clock } from 'lucide-react';

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';
  const initialLevel = searchParams.get('level') || 'all';

  const [results, setResults] = useState({ courses: [], teachers: [], discussions: [] });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: initialType,
    level: initialLevel
  });

  useEffect(() => {
    // Sync filters state if URL changes
    setFilters({
        type: searchParams.get('type') || 'all',
        level: searchParams.get('level') || 'all'
    });
  }, [searchParams]);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await searchService.searchGlobal(query, filters);
        setResults(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      fetchResults();
    } else {
      setLoading(false);
      setResults({ courses: [], teachers: [], discussions: [] });
    }
  }, [query, filters.type, filters.level]);

  const updateFilters = (newFilters) => {
    setFilters(newFilters);
    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (newFilters.type !== 'all') params.set('type', newFilters.type); else params.delete('type');
    if (newFilters.level !== 'all') params.set('level', newFilters.level); else params.delete('level');
    setSearchParams(params);
  };

  const hasResults = results.courses.length > 0 || results.teachers.length > 0 || results.discussions.length > 0;

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Search Results: {query} | EduPlatform</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Search Results</h1>
          <p className="text-muted-foreground">
             Showing results for <span className="font-semibold">"{query}"</span>
          </p>
        </div>

        <SearchFilters filters={filters} onFilterChange={updateFilters} />

        {loading ? (
           <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
           </div>
        ) : !hasResults ? (
           <div className="text-center py-16 border rounded-lg bg-muted/20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                 <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">No results found</h2>
              <p className="text-muted-foreground mt-2">Try checking for typos or using different keywords.</p>
           </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Results</TabsTrigger>
              <TabsTrigger value="courses">Courses ({results.courses.length})</TabsTrigger>
              <TabsTrigger value="people">People ({results.teachers.length})</TabsTrigger>
              <TabsTrigger value="discussions">Discussions ({results.discussions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6 space-y-8">
               {/* Courses Section */}
               {results.courses.length > 0 && (
                 <section>
                    <div className="flex items-center justify-between mb-4">
                       <h2 className="text-xl font-bold flex items-center gap-2">
                          <BookOpen className="h-5 w-5" /> Courses
                       </h2>
                       <Button variant="link" onClick={() => updateFilters({...filters, type: 'course'})}>View All</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {results.courses.slice(0, 3).map(course => (
                          <ResultCard key={course.id} type="course" data={course} />
                       ))}
                    </div>
                 </section>
               )}

               {/* People Section */}
               {results.teachers.length > 0 && (
                 <section>
                    <div className="flex items-center justify-between mb-4">
                       <h2 className="text-xl font-bold flex items-center gap-2">
                          <User className="h-5 w-5" /> People
                       </h2>
                       <Button variant="link" onClick={() => updateFilters({...filters, type: 'user'})}>View All</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {results.teachers.slice(0, 3).map(user => (
                          <ResultCard key={user.id} type="user" data={user} />
                       ))}
                    </div>
                 </section>
               )}

               {/* Discussions Section */}
               {results.discussions.length > 0 && (
                 <section>
                    <div className="flex items-center justify-between mb-4">
                       <h2 className="text-xl font-bold flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" /> Discussions
                       </h2>
                       <Button variant="link" onClick={() => updateFilters({...filters, type: 'forum'})}>View All</Button>
                    </div>
                    <div className="space-y-4">
                       {results.discussions.slice(0, 3).map(disc => (
                          <ResultCard key={disc.id} type="forum" data={disc} />
                       ))}
                    </div>
                 </section>
               )}
            </TabsContent>

            <TabsContent value="courses" className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {results.courses.map(course => (
                  <ResultCard key={course.id} type="course" data={course} />
               ))}
               {results.courses.length === 0 && <p className="text-muted-foreground col-span-full">No courses found matching your criteria.</p>}
            </TabsContent>

            <TabsContent value="people" className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {results.teachers.map(user => (
                  <ResultCard key={user.id} type="user" data={user} />
               ))}
               {results.teachers.length === 0 && <p className="text-muted-foreground col-span-full">No users found.</p>}
            </TabsContent>

            <TabsContent value="discussions" className="mt-6 space-y-4">
               {results.discussions.map(disc => (
                  <ResultCard key={disc.id} type="forum" data={disc} />
               ))}
               {results.discussions.length === 0 && <p className="text-muted-foreground col-span-full">No discussions found.</p>}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

// Sub-component for individual result cards
const ResultCard = ({ type, data }) => {
   if (type === 'course') {
      return (
         <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="p-4">
               {data.thumbnail_url && (
                  <img src={data.thumbnail_url} alt={data.title} className="w-full h-32 object-cover rounded-md mb-2" />
               )}
               <CardTitle className="text-lg line-clamp-1">
                  <Link to={`/courses/${data.id}`} className="hover:underline">{data.title}</Link>
               </CardTitle>
               <CardDescription className="line-clamp-2 text-xs">
                  {data.description}
               </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
               <div className="flex gap-2 mb-2">
                  <Badge variant="outline">{data.level}</Badge>
                  {data.price > 0 ? <Badge variant="secondary">€{data.price}</Badge> : <Badge variant="secondary">Free</Badge>}
               </div>
               <p className="text-xs text-muted-foreground">By {data.instructor?.full_name}</p>
            </CardContent>
         </Card>
      );
   }

   if (type === 'user') {
      return (
         <Card className="flex items-center p-4 gap-4 hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
               {data.avatar_url ? <img src={data.avatar_url} alt={data.full_name} className="h-full w-full object-cover" /> : <User className="h-6 w-6" />}
            </div>
            <div className="overflow-hidden">
               <h3 className="font-medium truncate">{data.full_name}</h3>
               <p className="text-xs text-muted-foreground capitalize">{data.role}</p>
            </div>
            {/* In a real app, link to profile */}
         </Card>
      );
   }

   if (type === 'forum') {
      return (
         <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="p-4">
               <CardTitle className="text-base">
                  <Link to={`/forum/discussion/${data.id}`} className="hover:underline flex items-center gap-2">
                     <MessageSquare className="h-4 w-4 text-muted-foreground" />
                     {data.title}
                  </Link>
               </CardTitle>
               <CardDescription className="flex items-center gap-4 text-xs">
                  <span>by {data.user?.full_name || 'Anonymous'}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(data.created_at).toLocaleDateString()}</span>
               </CardDescription>
            </CardHeader>
         </Card>
      );
   }
   return null;
};

export default SearchResults;