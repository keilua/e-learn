import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/customSupabaseClient';
import { requestBrowserPermission } from '@/utils/BrowserNotification';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Bell, Mail, Smartphone, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [prefs, setPrefs] = useState({
    email_enabled: true,
    sms_enabled: false,
    browser_enabled: true,
    frequency: 'immediate',
    types: {
      system: true,
      course: true,
      forum: true,
      badge: true,
      certificate: true,
      donation: true
    }
  });

  useEffect(() => {
    if (user) loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    try {
      // Use maybeSingle() to gracefully handle missing preferences row without throwing PGRST116
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPrefs(prev => ({
          ...prev,
          ...data,
          types: { ...prev.types, ...data.types }
        }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load preferences." });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check browser permissions if enabling
      if (prefs.browser_enabled) {
         const granted = await requestBrowserPermission();
         if (!granted && prefs.browser_enabled) {
             toast({ 
                 variant: "warning", 
                 title: "Browser Permission Denied", 
                 description: "We cannot send browser notifications without permission." 
             });
             // Keep it enabled in UI state though, user might enable in browser settings later
         }
      }

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...prefs,
          updated_at: new Date()
        });

      if (error) throw error;

      toast({ title: "Preferences Saved", description: "Your notification settings have been updated." });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleType = (type) => {
    setPrefs(prev => ({
      ...prev,
      types: { ...prev.types, [type]: !prev.types[type] }
    }));
  };

  if (loading) {
     return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">Customize how and when you want to be notified.</p>
      </div>

      <div className="space-y-6">
        {/* Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Delivery Channels</CardTitle>
            <CardDescription>Choose where you want to receive notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email.</p>
                </div>
              </div>
              <Switch 
                checked={prefs.email_enabled} 
                onCheckedChange={(c) => setPrefs(p => ({ ...p, email_enabled: c }))} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label className="text-base">Browser Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive push notifications in your browser.</p>
                </div>
              </div>
              <Switch 
                checked={prefs.browser_enabled} 
                onCheckedChange={(c) => setPrefs(p => ({ ...p, browser_enabled: c }))} 
              />
            </div>

            <div className="flex items-center justify-between opacity-50 cursor-not-allowed" title="SMS feature coming soon">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label className="text-base">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive critical alerts via text.</p>
                </div>
              </div>
              <Switch disabled checked={false} />
            </div>
          </CardContent>
        </Card>

        {/* Frequency */}
        <Card>
           <CardHeader>
             <CardTitle>Email Frequency</CardTitle>
             <CardDescription>How often should we send you email summaries?</CardDescription>
           </CardHeader>
           <CardContent>
              <RadioGroup 
                value={prefs.frequency} 
                onValueChange={(v) => setPrefs(p => ({ ...p, frequency: v }))}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                disabled={!prefs.email_enabled}
              >
                 <div className="flex items-center space-x-2 border rounded-md p-4 hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="immediate" id="freq-immediate" />
                    <Label htmlFor="freq-immediate" className="cursor-pointer">Immediate</Label>
                 </div>
                 <div className="flex items-center space-x-2 border rounded-md p-4 hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="daily" id="freq-daily" />
                    <Label htmlFor="freq-daily" className="cursor-pointer">Daily Digest</Label>
                 </div>
                 <div className="flex items-center space-x-2 border rounded-md p-4 hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="weekly" id="freq-weekly" />
                    <Label htmlFor="freq-weekly" className="cursor-pointer">Weekly Summary</Label>
                 </div>
              </RadioGroup>
           </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>Select which activities trigger a notification.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
             {[
               { id: 'course', label: 'Course Updates', desc: 'New content, announcements, and assignments.' },
               { id: 'forum', label: 'Discussion Forum', desc: 'Replies to your posts and mentions.' },
               { id: 'badge', label: 'Achievements', desc: 'New badges and certificate awards.' },
               { id: 'donation', label: 'Donations', desc: 'Updates on your contributions or received support.' },
               { id: 'system', label: 'System & Security', desc: 'Password changes, policy updates, and maintenance.' }
             ].map((type) => (
                <div key={type.id} className="flex items-center justify-between">
                   <div className="space-y-0.5">
                      <Label className="text-base">{type.label}</Label>
                      <p className="text-sm text-muted-foreground">{type.desc}</p>
                   </div>
                   <Switch 
                      checked={prefs.types[type.id]} 
                      onCheckedChange={() => toggleType(type.id)}
                   />
                </div>
             ))}
          </CardContent>
          <CardFooter className="flex justify-end pt-6">
             <Button variant="outline" className="mr-4" onClick={() => navigate(-1)}>Cancel</Button>
             <Button onClick={handleSave} disabled={saving}>
               {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Save Changes
             </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default NotificationPreferences;