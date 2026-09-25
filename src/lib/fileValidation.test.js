import { describe, it, expect } from 'vitest';
import { AVATAR_MAX_BYTES, validateAvatarFile, detectFileType } from './fileValidation';

// SEC-009 : type MIME réel (signature binaire) et taille des avatars.

const bytes = (...values) => new Uint8Array(values);
const fileOf = (content, name, type, padTo = 0) => {
  const body = padTo > content.length ? new Uint8Array(padTo) : new Uint8Array(content.length);
  body.set(content);
  return new File([body], name, { type });
};

const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1);
const GIF = new TextEncoder().encode('GIF89a\x01\x00\x01\x00\x00\x00');
const WEBP = new TextEncoder().encode('RIFF\x24\x00\x00\x00WEBPVP8 ');
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
const HTML = new TextEncoder().encode('<html><script>alert(1)</script></html>');
const EXE = bytes(0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0);

describe('detectFileType', () => {
  it.each([
    ['PNG', PNG, 'image/png'],
    ['JPEG', JPEG, 'image/jpeg'],
    ['GIF', GIF, 'image/gif'],
    ['WebP', WEBP, 'image/webp'],
    ['SVG', SVG, null],
    ['exécutable', EXE, null],
  ])('%s', async (_, content, expected) => {
    expect(await detectFileType(fileOf(content, 'f', ''))).toBe(expected);
  });
});

describe('validateAvatarFile', () => {
  it('accepte une vraie image et renvoie le type et l\'extension détectés', async () => {
    const result = await validateAvatarFile(fileOf(JPEG, 'photo.PNG', 'image/png'));
    expect(result).toEqual({ mimeType: 'image/jpeg', extension: 'jpg' });
  });

  it('refuse un fichier dont seule l\'extension et le type déclaré sont ceux d\'une image', async () => {
    await expect(validateAvatarFile(fileOf(HTML, 'avatar.png', 'image/png'))).rejects.toThrow(/JPEG, PNG, GIF or WebP/);
    await expect(validateAvatarFile(fileOf(EXE, 'avatar.jpg', 'image/jpeg'))).rejects.toThrow(/JPEG, PNG, GIF or WebP/);
  });

  it('refuse le SVG, qui peut contenir du script', async () => {
    await expect(validateAvatarFile(fileOf(SVG, 'avatar.svg', 'image/svg+xml'))).rejects.toThrow();
  });

  it('refuse un fichier trop volumineux', async () => {
    await expect(validateAvatarFile(fileOf(PNG, 'grand.png', 'image/png', AVATAR_MAX_BYTES + 1))).rejects.toThrow(/2 MB/);
  });

  it('accepte un fichier à la taille maximale exacte', async () => {
    await expect(validateAvatarFile(fileOf(PNG, 'limite.png', 'image/png', AVATAR_MAX_BYTES))).resolves.toMatchObject({ mimeType: 'image/png' });
  });

  it('refuse un fichier vide ou absent', async () => {
    await expect(validateAvatarFile(fileOf(new Uint8Array(), 'vide.png', 'image/png'))).rejects.toThrow();
    await expect(validateAvatarFile(null)).rejects.toThrow();
  });
});
