import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
const { default: QuizTaker } = await import('./QuizTaker');

const questions = [{ id: 'q1', question_text: 'Question ?', question_type: 'single_choice', points: 1, answers: [{ id: 'a1', answer_text: 'A' }] }];

describe('QuizTaker — minuterie', () => {
  it("ne soumet pas automatiquement un quiz sans limite de temps", async () => {
    vi.useFakeTimers();
    try {
      const onSubmit = vi.fn();
      render(<QuizTaker quiz={{ title: 'Quiz', time_limit_minutes: null }} questions={questions} onSubmit={onSubmit} />);
      await act(async () => { vi.advanceTimersByTime(5000); });
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.queryByText(/^\d+:\d{2}$/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('soumet automatiquement à la fin du temps imparti', async () => {
    vi.useFakeTimers();
    try {
      const onSubmit = vi.fn();
      render(<QuizTaker quiz={{ title: 'Quiz', time_limit_minutes: 1 }} questions={questions} onSubmit={onSubmit} />);
      expect(screen.getByText('1:00')).toBeTruthy();
      for (let i = 0; i < 61; i += 1) {
        await act(async () => { vi.advanceTimersByTime(1000); });
      }
      expect(onSubmit).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
