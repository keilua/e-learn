import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { CreditCard, Heart, Loader2 } from 'lucide-react';

const StripeForm = ({ amount, onSubmit, loading }) => (
  <div className="space-y-4 pt-4">
    <div className="p-4 border rounded-md bg-muted/20">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5 text-primary" />
        <span className="font-medium">Card Information</span>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="card-number">Card Number</Label>
          <Input id="card-number" placeholder="0000 0000 0000 0000" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="expiry">Expiry</Label>
            <Input id="expiry" placeholder="MM/YY" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cvc">CVC</Label>
            <Input id="cvc" placeholder="123" />
          </div>
        </div>
      </div>
    </div>
    <Button onClick={onSubmit} className="w-full" disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ''}
      Donate €{amount} via Stripe
    </Button>
  </div>
);

const PayPalButton = ({ amount, onSubmit, loading }) => (
  <div className="pt-6 text-center space-y-4">
    <p className="text-sm text-muted-foreground">You will be redirected to PayPal to complete your donation.</p>
    <Button 
      onClick={onSubmit} 
      className="w-full bg-[#0070ba] hover:bg-[#003087] text-white"
      disabled={loading}
    >
       {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ''}
       Pay with PayPal (€{amount})
    </Button>
  </div>
);

const DonationModal = ({ isOpen, onClose, recipientId, recipientName, type = 'teacher' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('10');
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [loading, setLoading] = useState(false);

  const predefinedAmounts = ['1', '5', '10', '25', '50'];
  const finalAmount = amount === 'custom' ? customAmount : amount;

  const handleDonation = async () => {
    if (!finalAmount || isNaN(finalAmount) || Number(finalAmount) <= 0) {
      toast({ variant: "destructive", title: "Invalid amount", description: "Please enter a valid donation amount." });
      return;
    }

    setLoading(true);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const transactionId = `${paymentMethod === 'stripe' ? 'ch_' : 'pp_'}${Math.random().toString(36).substring(2, 15)}`;

      const { error } = await supabase.from('donations').insert({
        donor_id: user?.id,
        recipient_id: recipientId,
        amount: finalAmount,
        type: type,
        payment_method: paymentMethod,
        payment_id: transactionId,
        message: message
      });

      if (error) throw error;

      toast({
        title: "Thank you! ❤️",
        description: `Your donation of €${finalAmount} has been received.`,
        duration: 5000,
      });

      onClose();
      setAmount('10');
      setCustomAmount('');
      setMessage('');
    } catch (error) {
      console.error(error);
      let errorMessage = error.message;
      if (errorMessage.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      toast({ variant: "destructive", title: "Donation failed", description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-current" />
            Donate to {type === 'platform' ? 'EduPlatform' : recipientName || 'Teacher'}
          </DialogTitle>
          <DialogDescription>
            Support {type === 'platform' ? 'the development of this platform' : 'this instructor'} directly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <Label>Select Amount (€)</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {predefinedAmounts.map((amt) => (
                <Button
                  key={amt}
                  variant={amount === amt ? "default" : "outline"}
                  onClick={() => setAmount(amt)}
                  className="w-full"
                >
                  €{amt}
                </Button>
              ))}
              <Button
                variant={amount === 'custom' ? "default" : "outline"}
                onClick={() => setAmount('custom')}
                className="w-full"
              >
                Custom
              </Button>
            </div>
            {amount === 'custom' && (
              <div className="mt-2">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                  <Input 
                    type="number" 
                    min="1" 
                    step="0.01"
                    placeholder="Enter amount" 
                    className="pl-8"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
             <Label htmlFor="message">Message (Optional)</Label>
             <Input 
                id="message" 
                placeholder="Leave a word of encouragement..." 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
             />
          </div>

          <Tabs defaultValue="stripe" value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stripe">Credit Card</TabsTrigger>
              <TabsTrigger value="paypal">PayPal</TabsTrigger>
            </TabsList>
            <TabsContent value="stripe">
              <StripeForm amount={finalAmount} onSubmit={handleDonation} loading={loading} />
            </TabsContent>
            <TabsContent value="paypal">
              <PayPalButton amount={finalAmount} onSubmit={handleDonation} loading={loading} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonationModal;