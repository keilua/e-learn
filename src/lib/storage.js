import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * SEC-004 — Accès aux fichiers stockés par URL signée à durée limitée.
 *
 * Les buckets sont privés. La base conserve l'URL « publique » renvoyée à l'upload
 * comme identifiant stable du fichier (…/storage/v1/object/public/<bucket>/<chemin>) ;
 * cette URL ne sert plus le fichier : on la convertit ici en URL signée au moment de
 * l'afficher. Le serveur ne signe que si l'utilisateur passe la politique RLS du bucket.
 */

// Durées de validité (secondes). Les vidéos sont lues en flux (requêtes Range tout au
// long de la lecture) : une URL de 60 s couperait la lecture, d'où 3600 s.
export const SIGNED_URL_TTL = {
  avatars: 3600,
  'lesson-pdfs': 60,
  'lesson-videos': 3600,
};

const STORAGE_URL = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?#]+)/;

/** Bucket et chemin d'une URL de stockage du projet, ou null pour toute autre URL. */
export const parseStorageUrl = (url) => {
  if (typeof url !== 'string') return null;
  const match = url.match(STORAGE_URL);
  if (!match || !Object.hasOwn(SIGNED_URL_TTL, match[1])) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
};

// Cache mémoire : une URL signée est réutilisée tant qu'il lui reste plus de 20 % de
// sa validité ; les demandes simultanées pour un même fichier sont mutualisées.
const cache = new Map();
const REUSE_RATIO = 0.2;

export const clearSignedUrlCache = () => cache.clear();

/**
 * URL affichable : signée pour un fichier du stockage, inchangée pour une URL externe
 * ou un aperçu local (blob:). Chaîne vide si la signature est refusée.
 */
export const getSignedUrl = async (url) => {
  const ref = parseStorageUrl(url);
  if (!ref) return url || '';

  const ttl = SIGNED_URL_TTL[ref.bucket];
  const key = `${ref.bucket}/${ref.path}`;
  const entry = cache.get(key);
  if (entry && (entry.pending || entry.expiresAt - Date.now() > ttl * 1000 * REUSE_RATIO)) {
    return entry.pending || entry.url;
  }

  const pending = supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, ttl)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) {
        cache.delete(key);
        return '';
      }
      cache.set(key, { url: data.signedUrl, expiresAt: Date.now() + ttl * 1000 });
      return data.signedUrl;
    })
    .catch(() => {
      cache.delete(key);
      return '';
    });

  cache.set(key, { pending });
  return pending;
};

/**
 * Hook : URL affichable d'un fichier.
 * null pendant la signature, chaîne vide si absente ou refusée, sinon l'URL.
 */
export const useSignedUrl = (url) => {
  const isStored = Boolean(parseStorageUrl(url));
  const [signed, setSigned] = useState(isStored ? null : url || '');

  useEffect(() => {
    let active = true;
    if (!parseStorageUrl(url)) {
      setSigned(url || '');
      return undefined;
    }
    setSigned(null);
    getSignedUrl(url).then((value) => {
      if (active) setSigned(value);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return signed;
};

/**
 * Ouvre un fichier dans un nouvel onglet avec une URL signée au moment du clic
 * (une URL de 60 s préparée à l'affichage aurait expiré).
 */
export const openStoredFile = async (url) => {
  // Onglet ouvert pendant le geste utilisateur, sinon bloqué après l'attente réseau.
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  const signed = await getSignedUrl(url);
  if (tab && signed) tab.location.href = signed;
  else if (tab) tab.close();
};
