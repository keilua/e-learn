import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// SEC-005 : message d'échec de connexion générique, identique que l'email existe ou non.

const toast = vi.fn();
const signInWithPassword = vi.fn();
const signUp = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/customSupabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword,
      signUp,
    },
    rpc: vi.fn(async () => ({ data: null, error: null })),
    from: vi.fn(),
  },
}));

const { AuthProvider, AuthContext } = await import('@/contexts/AuthContext');
const { useContext } = await import('react');
const { LOGIN_FAILED_MESSAGE, loginErrorMessage, registerErrorMessage } = await import('./authErrors');

const authError = (message, status = 400, code) => Object.assign(new Error(message), { status, code, name: 'AuthApiError' });

// Réponses de Supabase Auth selon l'état du compte visé.
const COMPTE_INEXISTANT = authError('Invalid login credentials', 400, 'invalid_credentials');
const MAUVAIS_MOT_DE_PASSE = authError('Invalid login credentials', 400, 'invalid_credentials');
const EMAIL_NON_CONFIRME = authError('Email not confirmed', 400, 'email_not_confirmed');
const COMPTE_BANNI = authError('User is banned', 400, 'user_banned');

describe('loginErrorMessage', () => {
  it.each([
    ['compte inexistant', COMPTE_INEXISTANT],
    ['mauvais mot de passe', MAUVAIS_MOT_DE_PASSE],
    ['email non confirmé (révélait l\'existence du compte)', EMAIL_NON_CONFIRME],
    ['compte banni', COMPTE_BANNI],
    ['erreur inconnue', new Error('Database error querying schema')],
  ])('renvoie le message générique : %s', (_, error) => {
    expect(loginErrorMessage(error)).toBe(LOGIN_FAILED_MESSAGE);
  });

  it('distingue seulement une panne réseau, qui ne dit rien du compte', () => {
    expect(loginErrorMessage(new TypeError('Failed to fetch'))).not.toBe(LOGIN_FAILED_MESSAGE);
  });
});

describe('registerErrorMessage', () => {
  it("ne révèle pas qu'un email est déjà inscrit", () => {
    const msg = registerErrorMessage(authError('User already registered', 422, 'user_already_exists'));
    expect(msg).not.toMatch(/already|exist|déjà/i);
  });

  it('conserve les consignes de mot de passe, utiles et sans rapport avec le compte', () => {
    expect(registerErrorMessage(authError('Password should be at least 6 characters.', 422, 'weak_password')))
      .toMatch(/password/i);
  });
});

describe('AuthContext.login', () => {
  beforeEach(() => {
    toast.mockReset();
    signInWithPassword.mockReset();
  });

  it('affiche exactement le même message pour un compte inexistant et un email non confirmé', async () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    signInWithPassword.mockResolvedValueOnce({ data: {}, error: COMPTE_INEXISTANT });
    await act(async () => { await result.current.login('inconnu@exemple.fr', 'x'); });
    signInWithPassword.mockResolvedValueOnce({ data: {}, error: EMAIL_NON_CONFIRME });
    await act(async () => { await result.current.login('existant@exemple.fr', 'x'); });

    const [first, second] = toast.mock.calls.map(([arg]) => arg.description);
    expect(first).toBe(LOGIN_FAILED_MESSAGE);
    expect(second).toBe(first);
  });
});
