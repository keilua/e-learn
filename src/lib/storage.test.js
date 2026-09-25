import { describe, it, expect, vi, beforeEach } from 'vitest';

const createSignedUrl = vi.fn();
const from = vi.fn(() => ({ createSignedUrl }));
vi.mock('@/lib/customSupabaseClient', () => ({ supabase: { storage: { from } } }));

const { SIGNED_URL_TTL, parseStorageUrl, getSignedUrl, clearSignedUrlCache } = await import('./storage');

const BASE = 'https://projet.supabase.co/storage/v1/object/public';

// SEC-004 : URL signées à durée limitée pour tous les fichiers stockés.
describe('SEC-004 — URL signées', () => {
  beforeEach(() => {
    createSignedUrl.mockReset();
    from.mockClear();
    clearSignedUrlCache();
    createSignedUrl.mockImplementation(async (path, ttl) => ({
      data: { signedUrl: `https://signe/${path}?ttl=${ttl}` },
      error: null,
    }));
  });

  it('applique 60 s aux documents et 3600 s aux avatars', () => {
    expect(SIGNED_URL_TTL['lesson-pdfs']).toBe(60);
    expect(SIGNED_URL_TTL.avatars).toBe(3600);
  });

  it('reconnaît les URL de stockage déjà enregistrées en base', () => {
    expect(parseStorageUrl(`${BASE}/avatars/u1-0.3.png`)).toEqual({ bucket: 'avatars', path: 'u1-0.3.png' });
    expect(parseStorageUrl(`${BASE}/lesson-pdfs/lessons/l1/cours%20v2.pdf`))
      .toEqual({ bucket: 'lesson-pdfs', path: 'lessons/l1/cours v2.pdf' });
    expect(parseStorageUrl('https://images.unsplash.com/photo.jpg')).toBeNull();
    expect(parseStorageUrl(`${BASE}/autre-bucket/x.png`)).toBeNull();
    expect(parseStorageUrl(null)).toBeNull();
  });

  it('signe un document pour 60 s', async () => {
    const url = await getSignedUrl(`${BASE}/lesson-pdfs/lessons/l1/support.pdf`);
    expect(from).toHaveBeenCalledWith('lesson-pdfs');
    expect(createSignedUrl).toHaveBeenCalledWith('lessons/l1/support.pdf', 60);
    expect(url).toBe('https://signe/lessons/l1/support.pdf?ttl=60');
  });

  it('signe un avatar pour 3600 s', async () => {
    await getSignedUrl(`${BASE}/avatars/u1.png`);
    expect(createSignedUrl).toHaveBeenCalledWith('u1.png', 3600);
  });

  it("ne renvoie jamais l'URL publique d'un fichier stocké, même en cas d'erreur", async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: new Error('Object not found') });
    expect(await getSignedUrl(`${BASE}/avatars/absent.png`)).toBe('');
  });

  it('laisse passer les URL externes et les aperçus locaux sans appel au stockage', async () => {
    expect(await getSignedUrl('https://images.unsplash.com/photo.jpg')).toBe('https://images.unsplash.com/photo.jpg');
    expect(await getSignedUrl('blob:http://localhost/123')).toBe('blob:http://localhost/123');
    expect(await getSignedUrl('')).toBe('');
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('réutilise une URL encore valide et mutualise les demandes simultanées', async () => {
    const url = `${BASE}/avatars/u2.png`;
    await Promise.all([getSignedUrl(url), getSignedUrl(url), getSignedUrl(url)]);
    await getSignedUrl(url);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('re-signe une URL proche de son expiration', async () => {
    vi.useFakeTimers();
    try {
      const url = `${BASE}/lesson-pdfs/doc.pdf`;
      await getSignedUrl(url);
      vi.advanceTimersByTime(50_000); // plus que 20 % de 60 s écoulés
      await getSignedUrl(url);
      expect(createSignedUrl).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
