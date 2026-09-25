import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { sanitizeHtml, safeMediaUrl, toVideoEmbedUrl } from './sanitize';

// SEC-003 : assainissement du contenu WYSIWYG à l'enregistrement et à l'affichage.

// pdf.js ne se charge pas sous jsdom ; le rendu PDF n'est pas l'objet de ces tests.
vi.mock('react-pdf', () => ({
  Document: () => null,
  Page: () => null,
  pdfjs: { GlobalWorkerOptions: {}, version: 'test' },
}));
const { default: LessonViewer } = await import('@/components/lessons/LessonViewer');

const XSS_PAYLOADS = [
  ['balise script', '<script>alert(1)</script><p>ok</p>'],
  ['gestionnaire onerror', '<img src="https://exemple.fr/x.png" onerror="alert(1)">'],
  ['lien javascript:', '<a href="javascript:alert(1)">clic</a>'],
  ['svg onload', '<svg onload="alert(1)"><circle r="1"></circle></svg>'],
  ['iframe', '<iframe src="https://evil.example"></iframe>'],
  ['lien data:text/html', '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">clic</a>'],
];

const dangerous = (html) =>
  /<script|<svg|<iframe|\son\w+\s*=|javascript:|data:|vbscript:/i.test(html);

describe('sanitizeHtml — charges XSS de référence', () => {
  it.each(XSS_PAYLOADS)('neutralise : %s', (_, payload) => {
    expect(dangerous(sanitizeHtml(payload))).toBe(false);
  });

  it('supprime tout attribut commençant par "on", même inconnu', () => {
    expect(sanitizeHtml('<p onpointerrawupdate="alert(1)" onfoo="x">t</p>')).toBe('<p>t</p>');
  });

  it('refuse les schémas obfusqués (casse, tabulation, entités)', () => {
    for (const href of ['JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', '&#106;avascript:alert(1)', 'vbscript:msgbox(1)', 'file:///etc/passwd']) {
      expect(sanitizeHtml(`<a href="${href}">x</a>`)).toBe('<a>x</a>');
    }
  });

  it('supprime les styles en ligne et les balises hors liste blanche', () => {
    expect(sanitizeHtml('<p style="background:url(x)">a</p><form><input></form><table><tr><td>b</td></tr></table>'))
      .toBe('<p>a</p>b');
  });

  it("conserve http, https et mailto, et durcit les liens externes", () => {
    const html = sanitizeHtml('<a href="https://mdn.io" target="_blank">m</a><a href="mailto:a@b.fr">e</a><img src="http://exemple.fr/i.png" alt="i">');
    expect(html).toContain('href="https://mdn.io"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('href="mailto:a@b.fr"');
    expect(html).toContain('src="http://exemple.fr/i.png"');
  });

  it("conserve le contenu produit par l'éditeur (Quill) et les leçons existantes", () => {
    const quill = '<h2>Titre</h2><p class="ql-align-center"><strong>gras</strong> <em>it</em> <u>s</u> <s>b</s></p>'
      + '<ol><li class="ql-indent-1">un</li></ol><ul><li>deux</li></ul><blockquote>c</blockquote>'
      + '<pre class="ql-syntax" spellcheck="false">&lt;p&gt;code&lt;/p&gt;</pre><p><code>x</code></p>';
    expect(sanitizeHtml(quill)).toBe(quill);
  });

  it('ne garde que les classes de mise en forme de l\'éditeur', () => {
    expect(sanitizeHtml('<p class="ql-align-right fixed inset-0 z-50">t</p>')).toBe('<p class="ql-align-right">t</p>');
  });

  it('accepte une valeur vide', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });
});

describe('URL des médias', () => {
  it('safeMediaUrl ne laisse passer que http et https', () => {
    expect(safeMediaUrl('https://x.supabase.co/v.mp4')).toBe('https://x.supabase.co/v.mp4');
    expect(safeMediaUrl(' javascript:alert(1)')).toBe('');
    expect(safeMediaUrl('data:video/mp4;base64,AAAA')).toBe('');
    expect(safeMediaUrl('')).toBe('');
  });

  it('toVideoEmbedUrl limite les iframes à YouTube et Vimeo en https', () => {
    expect(toVideoEmbedUrl('https://www.youtube.com/watch?v=abc123')).toBe('https://www.youtube.com/embed/abc123');
    expect(toVideoEmbedUrl('https://youtu.be/abc123')).toBe('https://www.youtube.com/embed/abc123');
    expect(toVideoEmbedUrl('https://vimeo.com/12345')).toBe('https://player.vimeo.com/video/12345');
    expect(toVideoEmbedUrl('javascript:alert(1)//youtube.com')).toBe('');
    expect(toVideoEmbedUrl('https://evil.example/?youtube.com')).toBe('');
  });
});

describe('LessonViewer — assainissement à l\'affichage', () => {
  it('n\'exécute aucun gestionnaire injecté dans le contenu texte', () => {
    const { container } = render(
      <LessonViewer lesson={{ type: 'text', content: '<img src="https://x.fr/a.png" onerror="alert(1)"><a href="javascript:alert(1)">l</a>' }} />
    );
    expect(container.innerHTML).not.toMatch(/onerror|javascript:/i);
  });

  it('ne charge pas une URL javascript: dans le lecteur vidéo', () => {
    const { container } = render(
      <LessonViewer lesson={{ type: 'video', title: 'v', video_url: 'javascript:alert(document.domain)//youtube.com' }} />
    );
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.innerHTML).not.toMatch(/javascript:/i);
  });
});
