import DOMPurify from 'dompurify';

/**
 * SEC-003 — Assainissement du HTML produit par l'éditeur WYSIWYG.
 * Appliqué à l'enregistrement (CreateLesson / EditLesson) ET à l'affichage (LessonViewer) :
 * un contenu écrit directement via l'API, sans passer par l'interface, reste neutralisé
 * au moment du rendu.
 */

// Liste blanche stricte : ce que produit la barre d'outils de l'éditeur, rien de plus.
export const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'span',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'a', 'img',
];

export const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'spellcheck'];

// Seuls schémas acceptés dans href / src.
const SAFE_URL = /^(?:https?|mailto):/i;
const URL_ATTRS = new Set(['href', 'src']);
// Classes de mise en forme de l'éditeur (alignement, indentation, bloc de code).
const EDITOR_CLASS = /^ql-[a-z0-9-]+$/;

const purifier = DOMPurify(typeof window !== 'undefined' ? window : undefined);

purifier.addHook('uponSanitizeAttribute', (_node, data) => {
  const name = data.attrName.toLowerCase();

  if (name.startsWith('on')) {
    data.keepAttr = false;
    return;
  }

  if (URL_ATTRS.has(name) && !SAFE_URL.test(data.attrValue.trim())) {
    data.keepAttr = false;
    return;
  }

  if (name === 'class') {
    const kept = data.attrValue.split(/\s+/).filter((c) => EDITOR_CLASS.test(c));
    if (kept.length === 0) data.keepAttr = false;
    else data.attrValue = kept.join(' ');
  }
});

purifier.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('target')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP: SAFE_URL,
  // DOMPurify teste la valeur de tout attribut contre ALLOWED_URI_REGEXP, sauf ceux-ci.
  ADD_URI_SAFE_ATTR: ['target', 'spellcheck'],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  KEEP_CONTENT: true,
};

/** Renvoie une version sûre du HTML fourni (chaîne vide si absent). */
export const sanitizeHtml = (html) => (html ? purifier.sanitize(String(html), CONFIG) : '');

/** URL de média (vidéo, PDF) : http(s) uniquement, sinon chaîne vide. */
export const safeMediaUrl = (url) => {
  const value = typeof url === 'string' ? url.trim() : '';
  return /^https?:\/\//i.test(value) ? value : '';
};

/**
 * Convertit un lien YouTube / Vimeo en URL d'intégration. Toute autre URL renvoie
 * une chaîne vide : aucune iframe n'est créée vers un domaine arbitraire.
 */
export const toVideoEmbedUrl = (url) => {
  let parsed;
  try {
    parsed = new URL(safeMediaUrl(url));
  } catch {
    return '';
  }
  if (parsed.protocol !== 'https:') return '';

  const host = parsed.hostname.replace(/^www\./, '');
  const id = (value) => (value && /^[\w-]{1,64}$/.test(value) ? value : '');

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const videoId = parsed.pathname.startsWith('/embed/')
      ? id(parsed.pathname.split('/')[2])
      : id(parsed.searchParams.get('v'));
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  }
  if (host === 'youtu.be') {
    const videoId = id(parsed.pathname.slice(1));
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const videoId = parsed.pathname.split('/').filter(Boolean).pop();
    return /^\d+$/.test(videoId || '') ? `https://player.vimeo.com/video/${videoId}` : '';
  }
  return '';
};
