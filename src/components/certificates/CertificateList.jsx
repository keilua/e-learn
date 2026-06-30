import React from 'react';
import CertificateCard from './CertificateCard';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const CertificateList = ({ certificates = [] }) => {
  if (certificates.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed rounded-lg bg-muted/20">
        <GraduationCap className="mx-auto h-16 w-16 text-muted-foreground opacity-50 mb-4" />
        <h3 className="text-xl font-semibold">No Certificates Yet</h3>
        <p className="text-muted-foreground mt-2">Complete all modules and pass the final quiz of a course to earn one!</p>
        <Button asChild className="mt-6">
          <Link to="/courses">Start Learning</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {certificates.map((cert) => (
        <CertificateCard key={cert.id} certificate={cert} />
      ))}
    </div>
  );
};

export default CertificateList;