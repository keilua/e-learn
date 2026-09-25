import React, { useState, useEffect } from 'react';
import { sanitizeHtml, safeMediaUrl, toVideoEmbedUrl } from '@/lib/sanitize';
import { useSignedUrl, openStoredFile } from '@/lib/storage';
import { FileText, Download, PlayCircle, Code, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Served locally via Vite's asset pipeline instead of a CDN, so PDF rendering
// doesn't depend on a third party being reachable/trustworthy at runtime.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Document téléchargé en une fois : l'URL signée ne vaut que 60 s (SEC-004), des
// requêtes partielles ultérieures échoueraient.
const PDF_OPTIONS = { disableRange: true, disableStream: true };

const LessonViewer = ({ lesson }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [loading, setLoading] = useState(true);
  // SEC-004 : fichiers du stockage servis par URL signée (URL externes inchangées).
  const videoUrl = useSignedUrl(safeMediaUrl(lesson?.video_url));
  const pdfUrl = useSignedUrl(safeMediaUrl(lesson?.resource_url));

  // Debug logging for PDF
  useEffect(() => {
    if (lesson?.type === 'pdf') {
      console.log('Attempting to load PDF:', {
        url: lesson.resource_url,
        pdfjsVersion: pdfjs.version,
        workerSrc: pdfjs.GlobalWorkerOptions.workerSrc
      });
      setLoading(true);
      setPdfError(null);
    }
  }, [lesson]);

  if (!lesson) return null;

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log('PDF loaded successfully. Pages:', numPages);
    setNumPages(numPages);
    setPdfError(null);
    setLoading(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setPdfError(error);
    setLoading(false);
  };

  const resourceUrl = safeMediaUrl(lesson.resource_url);

  // Video Renderer
  if (lesson.type === 'video' || (lesson.video_url && !lesson.type)) {
    const isYouTube = lesson.video_url?.includes('youtube.com') || lesson.video_url?.includes('youtu.be');
    const isVimeo = lesson.video_url?.includes('vimeo.com');
    const isUploadedFile = lesson.video_url?.includes('lesson-videos');

    if (isUploadedFile || (!isYouTube && !isVimeo)) {
      return (
        <div className="w-full bg-black rounded-lg overflow-hidden shadow-lg">
          {!videoError ? (
            <video 
              controls 
              className="w-full aspect-video"
              onError={(e) => {
                console.error('Video load error:', e);
                setVideoError(true);
              }}
              src={videoUrl || undefined}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center text-white p-8 bg-zinc-900">
              <AlertCircle className="h-16 w-16 mb-4 text-red-400" />
              <p className="text-lg mb-4">Unable to load video</p>
              {videoUrl && (
                <Button variant="secondary" onClick={() => openStoredFile(safeMediaUrl(lesson.video_url))}>
                  <Download className="mr-2 h-4 w-4" /> Download Video
                </Button>
              )}
            </div>
          )}
        </div>
      );
    }

    const embedUrl = toVideoEmbedUrl(lesson.video_url);

    return (
      <div className="aspect-video w-full bg-black flex items-center justify-center rounded-lg overflow-hidden shadow-lg">
        {embedUrl ? (
          <iframe 
            src={embedUrl} 
            title={lesson.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="text-white flex flex-col items-center">
            <PlayCircle className="h-16 w-16 mb-2 opacity-50" />
            <p>Video not available</p>
          </div>
        )}
      </div>
    );
  }

  // Text Renderer
  if (lesson.type === 'text' || (!lesson.type && lesson.content)) {
    const safeContent = sanitizeHtml(lesson.content);
    return (
      <div className="p-6 md:p-10 prose prose-slate dark:prose-invert max-w-none bg-card rounded-lg border shadow-sm">
        <div dangerouslySetInnerHTML={{ __html: safeContent }} />
      </div>
    );
  }

  // PDF Renderer
  if (lesson.type === 'pdf') {
    return (
      <div className="w-full space-y-4">
        {resourceUrl ? (
          <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-900 p-6 rounded-lg border shadow-sm min-h-[500px]">
            {pdfError || pdfUrl === '' ? (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to load PDF</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  {pdfError?.message || "There was an error loading the document. It might be restricted or deleted."}
                </p>
                <Button variant="outline" onClick={() => openStoredFile(resourceUrl)}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF Directly
                </Button>
              </div>
            ) : pdfUrl === null ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Loading document...</p>
              </div>
            ) : (
              <>
                <Document
                  file={pdfUrl}
                  options={PDF_OPTIONS}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex flex-col items-center justify-center p-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">Loading document...</p>
                    </div>
                  }
                  error={
                    <div className="text-destructive font-medium">
                      Failed to load PDF file.
                    </div>
                  }
                  className="max-w-full overflow-auto flex justify-center"
                >
                  <Page 
                    pageNumber={pageNumber} 
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-xl mb-4 max-w-full"
                    scale={1.0}
                    width={Math.min(window.innerWidth - 64, 800)} // Responsive width
                  />
                </Document>

                {numPages && (
                  <div className="flex flex-wrap items-center justify-center gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-full border shadow-lg sticky bottom-4 z-10">
                    <Button
                      onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                      disabled={pageNumber <= 1}
                      variant="ghost"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium px-2">
                      Page {pageNumber} of {numPages}
                    </span>
                    <Button
                      onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
                      disabled={pageNumber >= numPages}
                      variant="ghost"
                      size="sm"
                    >
                      Next
                    </Button>
                    <div className="w-px h-4 bg-border mx-2" />
                     <Button variant="ghost" size="sm" onClick={() => openStoredFile(resourceUrl)}>
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download</span>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-muted/30 text-center rounded-lg border border-dashed">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold mb-2">PDF Document</h3>
            <p className="text-muted-foreground">
              No PDF file associated with this lesson.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Code Renderer
  if (lesson.type === 'code') {
    return (
      <div className="p-6">
        <div className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto font-mono text-sm relative shadow-inner">
          <div className="absolute top-2 right-2 text-xs text-muted-foreground uppercase bg-slate-900 px-2 py-1 rounded">
            {lesson.code_language || 'code'}
          </div>
          <pre className="pt-6">{lesson.content}</pre>
        </div>
      </div>
    );
  }

  // Default Fallback
  return (
    <div className="p-12 text-center text-muted-foreground bg-muted/20 rounded-lg">
      <p>Content type not supported or empty.</p>
    </div>
  );
};

export default LessonViewer;