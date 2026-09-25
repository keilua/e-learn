/**
 * SEC-009 — Validation des fichiers envoyés : type réel lu dans la signature binaire
 * (« magic bytes ») plutôt que l'extension ou le type déclaré par le navigateur,
 * tous deux choisis par l'utilisateur. Le serveur de stockage impose en plus taille
 * et types par bucket (migration 20260925160000).
 */

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const SIGNATURES = [
  { mimeType: 'image/jpeg', extension: 'jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mimeType: 'image/png', extension: 'png', matches: (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v) },
  { mimeType: 'image/gif', extension: 'gif', matches: (b) => ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a' },
  { mimeType: 'image/webp', extension: 'webp', matches: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP' },
  { mimeType: 'application/pdf', extension: 'pdf', matches: (b) => ascii(b, 0, 5) === '%PDF-' },
  { mimeType: 'video/webm', extension: 'webm', matches: (b) => [0x1a, 0x45, 0xdf, 0xa3].every((v, i) => b[i] === v) },
  { mimeType: 'video/x-msvideo', extension: 'avi', matches: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'AVI ' },
  { mimeType: 'video/quicktime', extension: 'mov', matches: (b) => ascii(b, 4, 8) === 'ftyp' && ascii(b, 8, 10) === 'qt' },
  { mimeType: 'video/mp4', extension: 'mp4', matches: (b) => ascii(b, 4, 8) === 'ftyp' },
];

const ascii = (bytes, start, end) => String.fromCharCode(...bytes.slice(start, end));

const readHeader = (file, length = 16) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, length));
  });

const matchSignature = async (file) => {
  const header = await readHeader(file);
  return SIGNATURES.find((s) => s.matches(header)) || null;
};

/** Type MIME réel du fichier d'après sa signature, ou null s'il n'est pas reconnu. */
export const detectFileType = async (file) => (await matchSignature(file))?.mimeType ?? null;

const validate = async (file, { allowed, maxBytes, label }) => {
  if (!file || file.size === 0) throw new Error('Please choose a non-empty file.');
  if (file.size > maxBytes) {
    throw new Error(`File size exceeds ${Math.round(maxBytes / (1024 * 1024))} MB limit. Please choose a smaller file.`);
  }
  const signature = await matchSignature(file);
  if (!signature || !allowed.includes(signature.mimeType)) {
    throw new Error(`Invalid file. Please upload a ${label} file.`);
  }
  return { mimeType: signature.mimeType, extension: signature.extension };
};

/** Avatar : JPEG, PNG, GIF ou WebP réels, 2 Mo maximum. Le SVG est refusé (script). */
export const validateAvatarFile = (file) =>
  validate(file, {
    allowed: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxBytes: AVATAR_MAX_BYTES,
    label: 'JPEG, PNG, GIF or WebP',
  });

export const validatePdfFile = (file, maxBytes) =>
  validate(file, { allowed: ['application/pdf'], maxBytes, label: 'PDF' });

export const validateVideoFile = (file, maxBytes) =>
  validate(file, {
    allowed: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    maxBytes,
    label: 'MP4, WebM, MOV or AVI',
  });
