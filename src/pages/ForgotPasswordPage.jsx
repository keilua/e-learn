import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

const ForgotPasswordPage = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    await requestPasswordReset(email.trim());
    setIsSubmitting(false);
    // Always show the same confirmation, whether or not the email exists,
    // so this page can't be used to enumerate registered accounts.
    setSent(true);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Helmet>
        <title>Forgot Password | Crow Educ</title>
      </Helmet>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset your password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        {sent ? (
          <CardContent className="flex flex-col items-center gap-3 text-center py-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm text-muted-foreground">
              If an account exists for <span className="font-medium text-foreground">{email}</span>,
              you'll receive an email with a link to reset your password shortly.
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </CardContent>
          </form>
        )}
        <CardFooter className="flex justify-center">
          <Link to="/login" className="text-sm font-medium text-primary hover:underline flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
