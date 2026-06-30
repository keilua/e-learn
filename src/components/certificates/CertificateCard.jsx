import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import CertificatePreview from './CertificatePreview';

const CertificateCard = ({ certificate }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-0 flex flex-col md:flex-row h-full">
        {/* Left Color Bar */}
        <div className="w-full md:w-3 bg-primary/80 h-3 md:h-auto" />
        
        <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-xl mb-1">{certificate.course?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Instructor: {certificate.course?.instructor?.full_name}
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="mr-2 h-4 w-4" />
              Issued: {format(new Date(certificate.issued_date), 'MMM dd, yyyy')}
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" /> View Certificate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[95vw] overflow-y-auto max-h-[90vh]">
                <CertificatePreview 
                  certificate={certificate}
                  studentName={certificate.enrollment?.user?.full_name || "Student Name"}
                  courseName={certificate.course?.title}
                  issuedDate={certificate.issued_date}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CertificateCard;