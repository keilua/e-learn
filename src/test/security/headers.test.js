import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// SEC-001 / SEC-011 : en-têtes de sécurité servis par Apache (Hostinger) via public/.htaccess.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const htaccess = readFileSync(path.join(ROOT, 'public/.htaccess'), 'utf8');
const indexHtml = readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const header = (name) => {
  const match = htaccess.match(new RegExp(`Header always set ${name} "([^"]+)"`, 'i'));
  return match ? match[1] : null;
};

const csp = () => {
  const value = header('Content-Security-Policy') || '';
  return Object.fromEntries(
    value.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const [name, ...sources] = d.split(/\s+/);
      return [name, sources];
    })
  );
};

describe('SEC-001 — Content-Security-Policy', () => {
  it('est définie', () => {
    expect(header('Content-Security-Policy')).not.toBeNull();
  });

  it("n'autorise que les scripts du site (ni inline, ni eval)", () => {
    const { 'script-src': scripts = [] } = csp();
    expect(scripts).toContain("'self'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it('interdit plugins, changement de base, intégration par un tiers et envoi de formulaire externe', () => {
    const policy = csp();
    expect(policy['default-src']).toEqual(["'self'"]);
    expect(policy['object-src']).toEqual(["'none'"]);
    expect(policy['base-uri']).toEqual(["'self'"]);
    expect(policy['frame-ancestors']).toEqual(["'none'"]);
    expect(policy['form-action']).toEqual(["'self'"]);
  });

  it('limite les connexions à Supabase et les iframes aux lecteurs vidéo', () => {
    const policy = csp();
    expect(policy['connect-src']).toEqual(["'self'", 'https://*.supabase.co', 'wss://*.supabase.co']);
    expect(policy['frame-src']).toEqual(['https://www.youtube.com', 'https://player.vimeo.com']);
  });

  it("index.html ne contient aucun script en ligne (compatible avec script-src 'self')", () => {
    const inline = [...indexHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/gi)];
    expect(inline).toHaveLength(0);
  });
});

describe('SEC-011 — en-têtes de sécurité', () => {
  it.each([
    ['Strict-Transport-Security', /max-age=31536000; includeSubDomains/],
    ['X-Frame-Options', /^DENY$/],
    ['X-Content-Type-Options', /^nosniff$/],
    ['Referrer-Policy', /^strict-origin-when-cross-origin$/],
    ['Permissions-Policy', /camera=\(\).*microphone=\(\).*geolocation=\(\)/],
    ['Cross-Origin-Opener-Policy', /^same-origin$/],
  ])('%s', (name, expected) => {
    expect(header(name)).toMatch(expected);
  });

  it("ne divulgue pas la technologie du serveur (X-Powered-By)", () => {
    expect(htaccess).not.toMatch(/Header (always )?set X-Powered-By/i);
    expect(htaccess).toMatch(/Header (always )?unset X-Powered-By/i);
  });
});
