import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContext } from 'react';

// SEC-012 : chaque échec de connexion est journalisé côté serveur.

const rpc = vi.fn(async () => ({ data: null, error: null }));
const signInWithPassword = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/customSupabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword,
    },
    rpc,
    from: vi.fn(),
  },
}));

const { AuthProvider, AuthContext } = await import('./AuthContext');
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext — journalisation des échecs (SEC-012)', () => {
  beforeEach(() => {
    rpc.mockClear();
    signInWithPassword.mockReset();
  });

  it("journalise l'échec avec l'email et le motif, jamais le mot de passe", async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: Object.assign(new Error('Invalid login credentials'), { code: 'invalid_credentials' }),
    });
    const { result } = renderHook(() => useContext(AuthContext), { wrapper });
    await act(async () => { await result.current.login('victime@exemple.fr', 'secret-123'); });

    expect(rpc).toHaveBeenCalledWith('log_auth_failure', { p_email: 'victime@exemple.fr', p_reason: 'invalid_credentials' });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('secret-123');
  });

  it('déduit le motif du message quand supabase-js ne fournit pas de code', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: new Error('Email not confirmed') });
    const { result } = renderHook(() => useContext(AuthContext), { wrapper });
    await act(async () => { await result.current.login('a@exemple.fr', 'x'); });
    expect(rpc).toHaveBeenCalledWith('log_auth_failure', { p_email: 'a@exemple.fr', p_reason: 'email_not_confirmed' });
  });

  it('ne journalise pas une panne réseau (aucune tentative n\'a atteint le serveur)', async () => {
    signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useContext(AuthContext), { wrapper });
    await act(async () => { await result.current.login('a@exemple.fr', 'x'); });
    expect(rpc).not.toHaveBeenCalledWith('log_auth_failure', expect.anything());
  });

  it('ne journalise rien quand la connexion réussit', async () => {
    signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    const { result } = renderHook(() => useContext(AuthContext), { wrapper });
    await act(async () => { await result.current.login('a@exemple.fr', 'x'); });
    expect(rpc).not.toHaveBeenCalledWith('log_auth_failure', expect.anything());
  });
});
