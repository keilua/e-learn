import React from 'react';
import { useSignedUrl } from '@/lib/storage';

// <img> dont la source peut être un fichier du stockage Supabase : l'URL est signée
// avant affichage (SEC-004). Les URL externes sont utilisées telles quelles.
const StoredImage = ({ src, alt, ...props }) => {
  const signedSrc = useSignedUrl(src);
  if (!signedSrc) return null;
  return <img src={signedSrc} alt={alt} {...props} />;
};

export default StoredImage;
