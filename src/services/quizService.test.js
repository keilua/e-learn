import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
const from = vi.fn();
vi.mock('@/lib/customSupabaseClient', () => ({ supabase: { rpc, from } }));

const { quizService } = await import('./quizService');

describe('quizService (SEC-008 : notation côté serveur)', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it('charge le quiz via get_quiz_for_attempt, sans lire la table des réponses', async () => {
    rpc.mockResolvedValue({ data: { quiz: { id: 'q1' }, questions: [] }, error: null });

    const result = await quizService.getQuizForAttempt('q1');

    expect(rpc).toHaveBeenCalledWith('get_quiz_for_attempt', { p_quiz_id: 'q1' });
    expect(from).not.toHaveBeenCalled();
    expect(result.quiz.id).toBe('q1');
  });

  it('soumet les réponses brutes à submit_quiz_attempt sans calculer de score', async () => {
    const answers = { question1: 'reponse1', question2: ['a', 'b'] };
    rpc.mockResolvedValue({ data: { attempt: { score: 1 }, badge: null, completion: null }, error: null });

    const result = await quizService.submitQuizAttempt('q1', answers);

    expect(rpc).toHaveBeenCalledWith('submit_quiz_attempt', { p_quiz_id: 'q1', p_answers: answers });
    expect(from).not.toHaveBeenCalled();
    expect(result.attempt.score).toBe(1);
  });

  it('propage l\'erreur du serveur', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('Quiz introuvable') });
    await expect(quizService.submitQuizAttempt('q1', {})).rejects.toThrow('Quiz introuvable');
  });
});
