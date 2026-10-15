import { useEffect, useRef } from 'react';

export type LeaveRoundDialogProps = {
  /** Куда ведёт переход из шапки, с предлогом: «в атлас», «на главную». */
  readonly destination: string;
  readonly onLeave: () => void;
  readonly onStay: () => void;
};

/**
 * Переход по шапке посреди раунда. Прежде он молча бросал раунд: ответы
 * сохраняются только в конце, и случайное нажатие «Атлас» стирало всё
 * сыгранное без единого слова.
 *
 * Спрашивает только шапка. Кнопка «Прервать раунд» в колонке уже названа тем,
 * что делает, и второй вопрос после неё был бы лишним.
 *
 * Тот же лист бумаги, что окно старта игры: `<dialog>` даёт модальность, Esc
 * и возврат фокуса без своей обвязки. Фокус по умолчанию — на «Остаться»:
 * Enter по привычке не должен стирать раунд.
 */
export function LeaveRoundDialog({
  destination,
  onLeave,
  onStay,
}: LeaveRoundDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    stayRef.current?.focus();
  }, []);

  return (
    <dialog
      className="mode-dialog"
      ref={dialogRef}
      aria-labelledby="leave-round-title"
      aria-describedby="leave-round-note"
      onClose={onStay}
    >
      <div className="mode-dialog-body">
        <h2 id="leave-round-title">Прервать раунд и перейти {destination}?</h2>
        <p id="leave-round-note" className="mode-dialog-summary">
          Ответы этого раунда не сохранятся.
        </p>
        <div className="mode-dialog-actions">
          <button
            type="button"
            className="primary"
            ref={stayRef}
            onClick={() => dialogRef.current?.close()}
          >
            Продолжить раунд
          </button>
          <button type="button" className="secondary" onClick={onLeave}>
            Перейти
          </button>
        </div>
      </div>
    </dialog>
  );
}
