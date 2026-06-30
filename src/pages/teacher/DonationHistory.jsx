import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Heart, DollarSign, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const DonationHistory = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (user) fetchDonations();
  }, [user]);

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          donor:donor_id (full_name, email)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDonations(data || []);
      const total = (data || []).reduce((acc, curr) => acc + Number(curr.amount), 0);
      setTotalAmount(total);

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
             <Link to="/dashboard/teacher"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Donation History</h1>
            <p className="text-muted-foreground">Track support from your students.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{donations.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Donations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No donations received yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell>
                      <div className="font-medium">
                        {donation.donor ? donation.donor.full_name : 'Anonymous'}
                      </div>
                      {donation.donor && <div className="text-xs text-muted-foreground">{donation.donor.email}</div>}
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      €{Number(donation.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={donation.message}>
                      {donation.message || '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(donation.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {donation.payment_method}
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

export default DonationHistory;