import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, User, Save, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet';

const EditProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleAvatarChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    const file = e.target.files[0];
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return avatarUrl;

    try {
      setUploading(true);
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload avatar image. Please try again."
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalAvatarUrl = avatarUrl;

      // 1. Upload new avatar if selected
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        } else {
            // If upload fails, stop the update process
            setSaving(false);
            return;
        }
      }

      // 2. Update user profile
      const updates = {
        full_name: fullName,
        bio: bio,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // 3. Update Supabase Auth metadata (optional but good for consistency)
      await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: finalAvatarUrl }
      });

      // 4. Refresh context
      await refreshProfile();

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });

      // Navigate back to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard/student');
      }, 1000);

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not save profile changes."
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    return name
      ? name.split(' ').map((n) => n[0]).join('').toUpperCase()
      : 'U';
  };

  if (!user) return null;

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
      <Helmet>
        <title>Edit Profile | EduPlatform</title>
      </Helmet>
      
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-6 hover:bg-transparent pl-0 hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your personal information and avatar.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center sm:flex-row gap-6 p-4 border rounded-lg bg-muted/20">
              <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                <AvatarImage src={avatarPreview || avatarUrl} alt={fullName} className="object-cover" />
                <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <h3 className="font-medium">Profile Picture</h3>
                <p className="text-sm text-muted-foreground">
                  JPG, GIF or PNG. Max size of 2MB.
                </p>
                <div className="flex justify-center sm:justify-start">
                   <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                        <Upload className="h-4 w-4" />
                        {uploading ? 'Uploading...' : 'Change Avatar'}
                      </div>
                      <Input 
                        id="avatar-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarChange}
                        disabled={uploading}
                      />
                   </Label>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" value={user.email} disabled className="bg-muted text-muted-foreground" />
                <p className="text-[0.8rem] text-muted-foreground">
                    Your email address cannot be changed here.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                   <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                   <Input 
                    id="fullName" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    className="pl-9"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <textarea 
                    id="bio"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Tell us a little about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EditProfile;