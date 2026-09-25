import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// SEC-010 : aucune clé ni jeton ne doit être écrit en dur dans le code source.
// Les valeurs viennent des variables d'environnement (voir .env.example).

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
const SUPABASE_PROJECT_URL = /https:\/\/[a-z0-9]{20}\.supabase\.co/;

const listSourceFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    return /\.(js|jsx|ts|tsx)$/.test(name) ? [full] : [];
  });

describe('SEC-010 — secrets absents du code source', () => {
  const files = listSourceFiles(SRC_DIR).filter((f) => !f.endsWith('secrets.test.js'));

  it('parcourt bien des fichiers source', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('ne contient aucun jeton JWT en dur', () => {
    const offenders = files.filter((f) => JWT.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => path.relative(SRC_DIR, f))).toEqual([]);
  });

  it("ne contient aucune URL de projet Supabase en dur", () => {
    const offenders = files.filter((f) => SUPABASE_PROJECT_URL.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => path.relative(SRC_DIR, f))).toEqual([]);
  });
});
