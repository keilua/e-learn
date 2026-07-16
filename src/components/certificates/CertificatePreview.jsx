import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

const CertificatePreview = ({ certificate, studentName, courseName, issuedDate }) => {
  const certificateRef = useRef(null);

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificate-${courseName.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 print:hidden">
        <Button onClick={handleDownloadPDF} variant="outline">
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
      </div>

      {/* Certificate Design */}
      <div className="overflow-auto pb-4">
        <div 
          ref={certificateRef}
          className="min-w-[800px] w-full aspect-[1.414/1] bg-white text-black p-10 relative shadow-2xl mx-auto border-8 border-double border-slate-200"
          style={{ backgroundImage: 'radial-gradient(circle at center, #fff 0%, #f8f9fa 100%)' }}
        >
          {/* Ornamental Border */}
          <div className="absolute inset-4 border-2 border-slate-800 opacity-20 pointer-events-none"></div>
          <div className="absolute inset-6 border border-slate-800 opacity-10 pointer-events-none"></div>
          
          {/* Corner Decorations */}
          <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-primary opacity-50"></div>
          <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-primary opacity-50"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-primary opacity-50"></div>
          <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-primary opacity-50"></div>

          {/* Content */}
          <div className="h-full flex flex-col items-center justify-between py-12 text-center relative z-10">
            <div className="space-y-6">
              <div className="flex justify-center mb-8">
                {/* Logo Placeholder */}
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl">
                  EP
                </div>
              </div>
              
              <h1 className="text-5xl font-serif text-slate-800 tracking-wider uppercase mb-2">
                Certificate of Completion
              </h1>
              <p className="text-lg text-slate-500 uppercase tracking-widest">
                This certifies that
              </p>
            </div>

            <div className="space-y-4 w-full">
              <h2 className="text-4xl font-serif font-bold text-primary italic border-b-2 border-slate-200 pb-4 mx-20">
                {studentName}
              </h2>
              <p className="text-xl text-slate-600">
                has successfully completed the course
              </p>
              <h3 className="text-3xl font-bold text-slate-800">
                {courseName}
              </h3>
            </div>

            <div className="flex justify-between items-end w-full px-20 pt-12">
              <div className="text-center">
                <div className="text-lg font-bold text-slate-700">
                  {format(new Date(issuedDate), 'MMMM do, yyyy')}
                </div>
                <div className="w-40 border-t border-slate-400 mt-2"></div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Date Issued</div>
              </div>

              <div className="w-24 h-24 relative opacity-80">
                {/* Seal */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-primary fill-current">
                   <path d="M50 0 L61 35 L98 35 L68 57 L79 91 L50 70 L21 91 L32 57 L2 35 L39 35 Z" />
                </svg>
              </div>

              <div className="text-center">
                <div className="text-lg font-script font-bold text-slate-700 italic">
                  Crow Educ
                </div>
                <div className="w-40 border-t border-slate-400 mt-2"></div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Instructor Signature</div>
              </div>
            </div>

            <div className="absolute bottom-2 text-[10px] text-slate-300">
              Certificate ID: {certificate?.certificate_number || 'PENDING'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificatePreview;