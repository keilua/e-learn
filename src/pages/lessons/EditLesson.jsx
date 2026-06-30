import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { uploadPDF, uploadVideo } from '@/services/FileUploadService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Upload, X, CheckCircle, FileText, Video } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const EditLesson = () => {
  const { moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentType, setContentType] = useState('text');
  const [formData, setFormData] = useState({
    title: '',
    content: '', 
    video_url: '',
    resource_url: '', 
    code_language: 'javascript',
    duration_minutes: '',
    is_published: true
  });

  // File upload states
  const [pdfFile, setPdfFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
  const [existingFileUrl, setExistingFileUrl] = useState('');

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const { data, error } = await supabase.from('lessons').select('*').eq('id', lessonId).single();
        if (error) throw error;
        
        setContentType(data.type || 'text');
        setFormData({
          title: data.title || '',
          content: data.content || '',
          video_url: data.video_url || '',
          resource_url: data.resource_url || '',
          code_language: data.code_language || 'javascript',
          duration_minutes: data.duration_minutes || 0,
          is_published: data.is_published
        });

        // Set existing file URLs
        if (data.type === 'pdf' && data.resource_url) {
          setExistingFileUrl(data.resource_url);
        } else if (data.type === 'video' && data.video_url) {
          setExistingFileUrl(data.video_url);
        }
      } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Error loading content" });
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
  }, [lessonId]);

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'pdf') {
      setPdfFile(file);
      setUploadedPdfUrl('');
    } else if (type === 'video') {
      setVideoFile(file);
      setUploadedVideoUrl('');
    }
  };

  const handleFileUpload = async (type) => {
    const file = type === 'pdf' ? pdfFile : videoFile;
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
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
        uploadedUrl = await uploadPDF(file, lessonId);
        setUploadedPdfUrl(uploadedUrl);
        setFormData({ ...formData, resource_url: uploadedUrl });
        setExistingFileUrl(''); // Clear existing file reference
      } else {
        uploadedUrl = await uploadVideo(file, lessonId);
        setUploadedVideoUrl(uploadedUrl);
        setFormData({ ...formData, video_url: uploadedUrl });
        setExistingFileUrl(''); // Clear existing file reference
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
      if (!existingFileUrl) {
        setFormData({ ...formData, resource_url: '' });
      }
    } else {
      setVideoFile(null);
      setUploadedVideoUrl('');
      if (!existingFileUrl) {
        setFormData({ ...formData, video_url: '' });
      }
    }
  };

  const handleRemoveExistingFile = () => {
    setExistingFileUrl('');
    if (contentType === 'pdf') {
      setFormData({ ...formData, resource_url: '' });
    } else if (contentType === 'video') {
      setFormData({ ...formData, video_url: '' });
    }
    toast({ title: "File removed", description: "You can upload a new file or enter a URL." });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const lessonPayload = {
        title: formData.title,
        is_published: formData.is_published,
        duration_minutes: parseInt(formData.duration_minutes) || 0,
        content: (contentType === 'text' || contentType === 'code') ? formData.content : null,
        video_url: contentType === 'video' ? formData.video_url : null,
        resource_url: contentType === 'pdf' ? formData.resource_url : null,
        code_language: contentType === 'code' ? formData.code_language : null
      };

      const { error } = await supabase
        .from('lessons')
        .update(lessonPayload)
        .eq('id', lessonId);

      if (error) throw error;
      toast({ title: "Content updated successfully!" });
      navigate(-1);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container max-w-3xl py-10 px-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Edit Content</h1>
        <Badge variant="outline" className="uppercase">{contentType}</Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Content Title</Label>
              <Input 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                required 
              />
            </div>

            {contentType === 'text' && (
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea 
                  rows={10}
                  value={formData.content} 
                  onChange={e => setFormData({...formData, content: e.target.value})} 
                />
              </div>
            )}

            {contentType === 'video' && (
              <div className="space-y-4">
                {/* Existing File Display */}
                {existingFileUrl && !uploadedVideoUrl && (
                  <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 space-y-2">
                    <Label className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Current Video File
                    </Label>
                    <div className="flex items-center justify-between p-3 bg-background rounded border">
                      <span className="text-sm truncate flex-1">{existingFileUrl.split('/').pop()}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={handleRemoveExistingFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* File Upload Section */}
                {!existingFileUrl && (
                  <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                    <Label>Upload New Video File</Label>
                    
                    {!videoFile && !uploadedVideoUrl && (
                      <Input 
                        type="file"
                        accept=".mp4,.webm,.mov"
                        onChange={(e) => handleFileSelect(e, 'video')}
                      />
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
                )}

                {/* URL Input */}
                <div className="space-y-2">
                  <Label>Or Enter Video URL</Label>
                  <Input 
                    value={formData.video_url} 
                    onChange={e => setFormData({...formData, video_url: e.target.value})} 
                    disabled={!!existingFileUrl || !!uploadedVideoUrl}
                  />
                </div>
              </div>
            )}

            {contentType === 'pdf' && (
              <div className="space-y-4">
                {/* Existing File Display */}
                {existingFileUrl && !uploadedPdfUrl && (
                  <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Current PDF File
                    </Label>
                    <div className="flex items-center justify-between p-3 bg-background rounded border">
                      <span className="text-sm truncate flex-1">{existingFileUrl.split('/').pop()}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={handleRemoveExistingFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* File Upload Section */}
                {!existingFileUrl && (
                  <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                    <Label>Upload New PDF File</Label>
                    
                    {!pdfFile && !uploadedPdfUrl && (
                      <Input 
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileSelect(e, 'pdf')}
                      />
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
                )}

                {/* URL Input */}
                <div className="space-y-2">
                  <Label>Or Enter PDF URL</Label>
                  <Input 
                    value={formData.resource_url} 
                    onChange={e => setFormData({...formData, resource_url: e.target.value})} 
                    disabled={!!existingFileUrl || !!uploadedPdfUrl}
                  />
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
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code Snippet</Label>
                  <Textarea 
                    rows={10}
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})} 
                    className="font-mono text-sm"
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
                <Label>Published</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving || uploading} className="w-full">
          {saving && <Loader2 className="animate-spin mr-2" />} Save Changes
        </Button>
      </form>
    </div>
  );
};

export default EditLesson;