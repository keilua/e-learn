import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ArrowLeft, DollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AdminDonationHistory = () => {
  const { user } = useAuth(); 
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, count: 0, platformTotal: 0 });

  useEffect(() => {
    if (user) fetchAllDonations();
  }, [user]);

  const fetchAllDonations = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          donor:donor_id (full_name, email),
          recipient:recipient_id (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const allData = data || [];
      setDonations(allData);
      
      const total = allData.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const platformTotal = allData
        .filter(d => d.type === 'platform')
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

      setStats({
        total,
        count: allData.length,
        platformTotal
      });

    } catch (error) {
      console.error('Error fetching admin donations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild size="icon">
             <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
             <h1 className="text-3xl font-bold">Platform Donation Overview</h1>
             <p className="text-muted-foreground">Admin view of all financial support.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{stats.platformTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Direct support to platform</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.count}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell>
                      {format(new Date(donation.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{donation.donor ? donation.donor.full_name : 'Anonymous'}</div>
                      <div className="text-xs text-muted-foreground">{donation.donor?.email}</div>
                    </TableCell>
                    <TableCell>
                      {donation.type === 'platform' ? 
                        <Badge variant="secondary">Platform</Badge> : 
                        donation.recipient?.full_name || 'Teacher'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{donation.type}</Badge>
                    </TableCell>
                    <TableCell className="font-bold">
                      €{Number(donation.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground text-sm">
                      {donation.payment_method}
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

export default AdminDonationHistory;