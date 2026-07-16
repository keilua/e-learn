import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/customSupabaseClient';
import CertificateList from '@/components/certificates/CertificateList';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const MyCertificates = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      if (!user) return;
      try {
        const { data: certs, error: certError } = await supabase
            .from('certificates')
            .select(`
                *,
                enrollment:course_enrollments (
                    user:users(full_name)
                )
            `)
            .eq('enrollment.user_id', user.id); 

        if (certError) throw certError;

        const enhancedCerts = await Promise.all(certs.map(async (cert) => {
             const { data: enrollmentData } = await supabase
                .from('course_enrollments')
                .select('course:courses(title, instructor:users(full_name))')
                .eq('id', cert.enrollment_id)
                .single();
             
             return {
                 ...cert,
                 course: enrollmentData?.course
             };
        }));

        setCertificates(enhancedCerts || []);
      } catch (error) {
        console.error('Error fetching certificates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, [user]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Helmet>
        <title>My Certificates | Crow Educ</title>
      </Helmet>

      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" asChild size="icon">
           <Link to="/dashboard/student"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
           <h1 className="text-3xl font-bold">My Certificates</h1>
           <p className="text-muted-foreground">Official credentials earned for your completed courses.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : (
        <CertificateList certificates={certificates} />
      )}
    </div>
  );
};

export default MyCertificates;