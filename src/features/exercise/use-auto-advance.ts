import { useEffect, useRef } from 'react';
import { CORRECT_PAUSE_MS, WRONG_PAUSE_MS } from './round-pace';

/**
 * Таймер автоперехода к следующему вопросу, общий для трёх раундов
 * (`ExerciseRound`, `CityRound`, `PhysicalRound`): они дословно делили один и
 * тот же код планирования и очистки.
 *
 * Таймер живёт в ссылке, а не в состоянии: уход с экрана посреди паузы не
 * должен переводить раунд, которого уже нет, — размонтированный компонент не
 * должен вызывать `advance`.
 */
export function useAutoAdvance() {
  const advanceTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
      }
    },
    [],
  );

  function schedule(isCorrect: boolean, advance: () => void) {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
    }

    advanceTimer.current = window.setTimeout(
      () => {
        advanceTimer.current = null;
        advance();
      },
      isCorrect ? CORRECT_PAUSE_MS : WRONG_PAUSE_MS,
    );
  }

  return { schedule };
}
