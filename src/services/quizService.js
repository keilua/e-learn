import { supabase } from '@/lib/customSupabaseClient';

/**
 * Accès aux quiz côté apprenant. La notation se fait exclusivement côté serveur
 * (fonction SQL submit_quiz_attempt) : le corrigé n'est jamais envoyé au navigateur.
 */
export const quizService = {
  /**
   * Quiz et questions à afficher, sans le corrigé.
   * @returns {Promise<{ quiz: object, questions: Array<{ id, question_text, question_type, points, order_index, answers: Array<{ id, answer_text }> }> }>}
   */
  async getQuizForAttempt(quizId) {
    const { data, error } = await supabase.rpc('get_quiz_for_attempt', { p_quiz_id: quizId });
    if (error) throw error;
    return data;
  },

  /**
   * Soumet les réponses ; le serveur note, enregistre la tentative, attribue badge
   * et certificat le cas échéant.
   * @param {Record<string, string | string[]>} answers réponses par identifiant de question
   * @returns {Promise<{ attempt: object, badge: { id, name } | null, completion: object | null }>}
   */
  async submitQuizAttempt(quizId, answers) {
    const { data, error } = await supabase.rpc('submit_quiz_attempt', {
      p_quiz_id: quizId,
      p_answers: answers,
    });
    if (error) throw error;
    return data;
  },
};

export default quizService;
