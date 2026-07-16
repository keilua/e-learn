import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Lock, AlertTriangle } from 'lucide-react';

const ResetPasswordPage = () => {
  const { user, loading, updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(password);
    setIsSubmitting(false);

    if (!error) {
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
      });
      navigate('/dashboard');
    } else {
      setFormError(error.message || 'Could not update your password.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Helmet>
        <title>Reset Password | Crow Educ</title>
      </Helmet>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Choose a new password</CardTitle>
          <CardDescription className="text-center">
            Enter a new password for your account.
          </CardDescription>
        </CardHeader>

        {!user ? (
          <CardContent className="flex flex-col items-center gap-3 text-center py-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              This reset link is invalid or has expired. Please request a new one.
            </p>
            <Button asChild className="mt-2">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    className="pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </CardContent>
          </form>
        )}

        <CardFooter className="flex justify-center">
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
