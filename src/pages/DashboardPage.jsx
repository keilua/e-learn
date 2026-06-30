import React from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Trophy, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFeatureClick = () => {
    toast({
      title: "Feature coming soon",
      description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Dashboard | EduPlatform</title>
        <meta name="description" content="Your personal learning dashboard" />
      </Helmet>
      
      <div className="flex flex-col space-y-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back, {user?.user_metadata?.full_name || user?.email}! Here's your learning overview.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleFeatureClick}>Download Report</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Enrolled Courses
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +0 from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Hours Spent
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +0% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Certificates
              </CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +0 earned total
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your recent course progress and achievements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No recent activity to show.
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recommended Courses</CardTitle>
              <CardDescription>
                Courses you might be interested in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </span>
                  <p className="text-sm text-muted-foreground">Explore our course catalog to get started!</p>
                </div>
                <Button variant="outline" className="w-full" onClick={handleFeatureClick}>
                  Browse Catalog
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;