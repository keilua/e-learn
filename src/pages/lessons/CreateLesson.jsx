import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { uploadPDF, uploadVideo } from '@/services/FileUploadService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/lessons/RichTextEditor';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, FileText, Video, Code, File, Upload, X, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const CreateLesson = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState('text');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    video_url: '',
    resource_url: '',
    code_language: 'javascript',
    duration_minutes: '10',
    is_published: true
  });

  // File upload states
  const [pdfFile, setPdfFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'pdf') {
      setPdfFile(file);
      setUploadedPdfUrl(''); // Clear previous upload
    } else if (type === 'video') {
      setVideoFile(file);
      setUploadedVideoUrl(''); // Clear previous upload
    }
  };

  const handleFileUpload = async (type) => {
    const file = type === 'pdf' ? pdfFile : videoFile;
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress (since Supabase doesn't provide upload progress callback)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      let uploadedUrl;
      if (type === 'pdf') {
        uploadedUrl = await uploadPDF(file);
        setUploadedPdfUrl(uploadedUrl);
        setFormData({ ...formData, resource_url: uploadedUrl });
      } else {
        uploadedUrl = await uploadVideo(file);
        setUploadedVideoUrl(uploadedUrl);
        setFormData({ ...formData, video_url: uploadedUrl });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: "Upload successful!",
        description: `${type === 'pdf' ? 'PDF' : 'Video'} file uploaded successfully.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleRemoveFile = (type) => {
    if (type === 'pdf') {
      setPdfFile(null);
      setUploadedPdfUrl('');
      setFormData({ ...formData, resource_url: '' });
    } else {
      setVideoFile(null);
      setUploadedVideoUrl('');
      setFormData({ ...formData, video_url: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get order
      const { data: existingLessons } = await supabase
        .from('lessons')
        .select('order_index')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: false })
        .limit(1);
      
      const nextIndex = existingLessons?.[0] ? existingLessons[0].order_index + 1 : 0;

      const lessonPayload = {
        title: formData.title,
        module_id: moduleId,
        order_index: nextIndex,
        type: contentType,
        is_published: formData.is_published,
        duration_minutes: parseInt(formData.duration_minutes) || 0,
        content: (contentType === 'text' || contentType === 'code') ? formData.content : null,
        video_url: contentType === 'video' ? formData.video_url : null,
        resource_url: contentType === 'pdf' ? formData.resource_url : null,
        code_language: contentType === 'code' ? formData.code_language : null
      };

      const { error } = await supabase
        .from('lessons')
        .insert([lessonPayload]);

      if (error) throw error;
      toast({ title: "Content added successfully!" });
      navigate(-1);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl py-10 px-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
      </Button>
      <h1 className="text-3xl font-bold mb-2">Add Content</h1>
      <p className="text-muted-foreground mb-8">Choose a content type and fill in the details.</p>
      
      <Tabs defaultValue="text" value={contentType} onValueChange={setContentType} className="mb-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="text" className="gap-2"><FileText className="h-4 w-4"/> Text Block</TabsTrigger>
          <TabsTrigger value="video" className="gap-2"><Video className="h-4 w-4"/> Video</TabsTrigger>
          <TabsTrigger value="pdf" className="gap-2"><File className="h-4 w-4"/> PDF Document</TabsTrigger>
          <TabsTrigger value="code" className="gap-2"><Code className="h-4 w-4"/> Code Snippet</TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Content Title</Label>
              <Input 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                required 
                placeholder="e.g. Introduction to Variables"
              />
            </div>

            {contentType === 'text' && (
              <div className="space-y-2">
                <Label>Content</Label>
                <RichTextEditor
                  value={formData.content}
                  onChange={content => setFormData({ ...formData, content })}
                  placeholder="Write your lesson content here..."
                />
              </div>
            )}

            {contentType === 'video' && (
              <div className="space-y-4">
                {/* File Upload Section */}
                <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                  <Label>Upload Video File</Label>
                  
                  {!videoFile && !uploadedVideoUrl && (
                    <div className="flex items-center gap-2">
                      <Input 
                        type="file"
                        accept=".mp4,.webm,.mov"
                        onChange={(e) => handleFileSelect(e, 'video')}
                        className="flex-1"
                      />
                    </div>
                  )}

                  {videoFile && !uploadedVideoUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-background rounded border">
                        <span className="text-sm truncate flex-1">{videoFile.name}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveFile('video')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button 
                        type="button"
                        onClick={() => handleFileUpload('video')}
                        disabled={uploading}
                        className="w-full"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Video
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {uploading && uploadProgress > 0 && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">{uploadProgress}%</p>
                    </div>
                  )}

                  {uploadedVideoUrl && (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700 dark:text-green-400">Video uploaded successfully</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveFile('video')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* URL Input as Alternative */}
                <div className="space-y-2">
                  <Label>Or Enter Video URL</Label>
                  <Input 
                    value={formData.video_url} 
                    onChange={e => setFormData({...formData, video_url: e.target.value})} 
                    placeholder="https://youtube.com/watch?v=... or direct video URL"
                    disabled={!!uploadedVideoUrl}
                  />
                  <p className="text-xs text-muted-foreground">YouTube, Vimeo, or direct video links supported.</p>
                </div>
              </div>
            )}

            {contentType === 'pdf' && (
              <div className="space-y-4">
                {/* File Upload Section */}
                <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                  <Label>Upload PDF File</Label>
                  
                  {!pdfFile && !uploadedPdfUrl && (
                    <div className="flex items-center gap-2">
                      <Input 
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileSelect(e, 'pdf')}
                        className="flex-1"
                      />
                    </div>
                  )}

                  {pdfFile && !uploadedPdfUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-background rounded border">
                        <span className="text-sm truncate flex-1">{pdfFile.name}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveFile('pdf')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button 
                        type="button"
                        onClick={() => handleFileUpload('pdf')}
                        disabled={uploading}
                        className="w-full"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload PDF
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {uploading && uploadProgress > 0 && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">{uploadProgress}%</p>
                    </div>
                  )}

                  {uploadedPdfUrl && (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700 dark:text-green-400">PDF uploaded successfully</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveFile('pdf')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* URL Input as Alternative */}
                <div className="space-y-2">
                  <Label>Or Enter PDF URL</Label>
                  <Input 
                    value={formData.resource_url} 
                    onChange={e => setFormData({...formData, resource_url: e.target.value})} 
                    placeholder="https://example.com/document.pdf"
                    disabled={!!uploadedPdfUrl}
                  />
                  <p className="text-xs text-muted-foreground">Direct link to a PDF file.</p>
                </div>
              </div>
            )}

            {contentType === 'code' && (
              <>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Input 
                    value={formData.code_language} 
                    onChange={e => setFormData({...formData, code_language: e.target.value})} 
                    placeholder="javascript, python, html, css..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code Snippet</Label>
                  <Textarea 
                    rows={10}
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})} 
                    className="font-mono text-sm"
                    placeholder="// Type your code here..."
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label>Estimated Duration (mins)</Label>
                <Input 
                  type="number"
                  value={formData.duration_minutes} 
                  onChange={e => setFormData({...formData, duration_minutes: e.target.value})} 
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch 
                  checked={formData.is_published} 
                  onCheckedChange={c => setFormData({...formData, is_published: c})} 
                />
                <Label>Published immediately</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading || uploading} className="w-full">
          {loading && <Loader2 className="animate-spin mr-2" />} Save Content
        </Button>
      </form>
    </div>
  );
};

export default CreateLesson;