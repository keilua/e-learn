import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ArrowLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const StudentDonationHistory = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDonations();
  }, [user]);

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          recipient:recipient_id (full_name)
        `)
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-4">
            <Button variant="ghost" asChild size="icon">
                <Link to="/dashboard/student"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold">My Contributions</h1>
                <p className="text-muted-foreground">Thank you for supporting our educators!</p>
            </div>
         </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Donation History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">No donations yet</h3>
              <p className="text-muted-foreground">Your support makes a difference.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell className="font-medium">
                      {donation.type === 'platform' ? 'EduPlatform' : donation.recipient?.full_name || 'Unknown Teacher'}
                    </TableCell>
                    <TableCell className="font-bold">
                      €{Number(donation.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {donation.type}
                    </TableCell>
                    <TableCell>
                      {format(new Date(donation.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDonationHistory;