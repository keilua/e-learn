import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import DonationModal from './DonationModal';

const DonationButton = ({ recipientId, recipientName, type = 'teacher', variant = 'default', className, label = "Donate" }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant={variant} 
        className={className} 
        onClick={() => setIsOpen(true)}
      >
        <Heart className="mr-2 h-4 w-4 fill-current" />
        {label}
      </Button>

      <DonationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        recipientId={recipientId}
        recipientName={recipientName}
        type={type}
      />
    </>
  );
};

export default DonationButton;