import { act, fireEvent, render, screen } from '@testing-library/react';
import { CORRECT_PAUSE_MS, WRONG_PAUSE_MS } from './round-pace';
import { useAutoAdvance } from './use-auto-advance';

/** Пробный компонент: хук нельзя вызвать вне рендера. */
function Probe({
  isCorrect,
  onAdvance,
}: {
  readonly isCorrect: boolean;
  readonly onAdvance: () => void;
}) {
  const { schedule } = useAutoAdvance();

  return (
    <button type="button" onClick={() => schedule(isCorrect, onAdvance)}>
      ответить
    </button>
  );
}

it('планирует переход после верного ответа на CORRECT_PAUSE_MS', () => {
  vi.useFakeTimers();
  try {
    const advance = vi.fn();
    render(<Probe isCorrect onAdvance={advance} />);

    fireEvent.click(screen.getByRole('button'));
    act(() => {
      vi.advanceTimersByTime(CORRECT_PAUSE_MS - 1);
    });
    expect(advance).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(advance).toHaveBeenCalledOnce();
  } finally {
    vi.useRealTimers();
  }
});

it('планирует переход после ошибки на WRONG_PAUSE_MS', () => {
  vi.useFakeTimers();
  try {
    const advance = vi.fn();
    render(<Probe isCorrect={false} onAdvance={advance} />);

    fireEvent.click(screen.getByRole('button'));
    act(() => {
      vi.advanceTimersByTime(WRONG_PAUSE_MS - 1);
    });
    expect(advance).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(advance).toHaveBeenCalledOnce();
  } finally {
    vi.useRealTimers();
  }
});

/*
 * Главный довод докстринга хука: уход с экрана посреди паузы не должен
 * переводить раунд, которого уже нет. Без очистки в эффекте размонтирования
 * `advance` дёрнул бы уже отсутствующий компонент — здесь это вызов колбэка,
 * который в ExerciseRound/CityRound/PhysicalRound меняет состояние раунда.
 */
it('уход с экрана посреди паузы не вызывает переход', () => {
  vi.useFakeTimers();
  try {
    const advance = vi.fn();
    const { unmount } = render(<Probe isCorrect={false} onAdvance={advance} />);

    fireEvent.click(screen.getByRole('button'));
    unmount();

    act(() => {
      vi.advanceTimersByTime(WRONG_PAUSE_MS);
    });

    expect(advance).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
