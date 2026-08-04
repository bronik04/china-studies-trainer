import { useEffect, useState } from 'react';

export type RoundStopwatchProps = {
  /** Отметка `performance.now()` в момент старта раунда. */
  readonly startedAt: number;
};

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Секундомер идёт вверх и ничего не ограничивает: медленный ответ не
 * наказывается (UI_UX.md). Значение обновляется раз в секунду и помечено
 * `aria-hidden` — программе чтения с экрана незачем объявлять каждую секунду,
 * итоговое время называется на экране результатов.
 */
export function RoundStopwatch({ startedAt }: RoundStopwatchProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMs(performance.now() - startedAt);
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <span className="round-stopwatch" aria-hidden="true">
      {formatElapsed(elapsedMs)}
    </span>
  );
}
