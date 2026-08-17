import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { RoundStopwatch } from './RoundStopwatch';
import { useFullscreen } from './use-fullscreen';

export type RoundStageProps = {
  /** Содержимое плашки: вопрос или показ верного ответа после ошибки. */
  readonly prompt: ReactNode;
  readonly promptState: 'question' | 'answer';
  /** Отметка `performance.now()` старта раунда — секундомеру строки. */
  readonly startedAt: number;
  /** Счёт и след раунда в служебной строке. */
  readonly progress: ReactNode;
  /** Полоса вариантов под картой; не передана — полосы нет, карта выше. */
  readonly choices?: ReactNode;
  /** Содержимое панели «Ответить из списка»; не передано — кнопки нет. */
  readonly answerList?: ReactNode;
  readonly onExit: () => void;
  /** Карта. */
  readonly children: ReactNode;
};

/**
 * Компоновка игрового экрана — одна на все четыре вида раундов (спек
 * RoundStage, 2026-08-17): плашка вопроса поверх карты, полоса вариантов и
 * служебная строка под ней. Порядок DOM — вопрос, карта, варианты, строка;
 * поверх карты плашку ставит только CSS.
 *
 * Плашка — aria-live: смена вопроса и показ верного ответа объявляются
 * читалке. Раньше это делал перевод фокуса на заголовок разбора — самого
 * разбора больше нет.
 *
 * Полноэкранная кнопка разворачивает корень оболочки: шапка сайта остаётся
 * вне полного экрана, решение 2026-08-05 о шапке не отменяется.
 */
export function RoundStage({
  prompt,
  promptState,
  startedAt,
  progress,
  choices,
  answerList,
  onExit,
  children,
}: RoundStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isListOpen, setIsListOpen] = useState(false);
  const fullscreen = useFullscreen(stageRef);

  // Фокус уходит в открытую панель: следующий Tab — уже по списку.
  useEffect(() => {
    if (isListOpen) {
      panelRef.current?.focus();
    }
  }, [isListOpen]);

  function closeList() {
    setIsListOpen(false);
    listButtonRef.current?.focus();
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      closeList();
    }
  }

  return (
    <main className="round-stage" ref={stageRef}>
      <div className="stage-prompt" data-state={promptState} aria-live="polite">
        {prompt}
      </div>
      <div className="stage-map">
        {children}
        {answerList !== undefined && isListOpen ? (
          <div
            className="stage-answer-panel"
            ref={panelRef}
            tabIndex={-1}
            role="group"
            aria-label="Ответ из списка"
            onKeyDown={handlePanelKeyDown}
          >
            {answerList}
          </div>
        ) : null}
      </div>
      {choices !== undefined ? (
        <div className="stage-choices-band">{choices}</div>
      ) : null}
      <footer className="stage-strip">
        <RoundStopwatch startedAt={startedAt} />
        {progress}
        <div className="stage-strip-actions">
          {answerList !== undefined ? (
            <button
              type="button"
              className="stage-strip-button"
              ref={listButtonRef}
              aria-expanded={isListOpen}
              onClick={() => (isListOpen ? closeList() : setIsListOpen(true))}
            >
              Ответить из списка
            </button>
          ) : null}
          <button type="button" className="stage-strip-button" onClick={onExit}>
            Прервать раунд
          </button>
          {fullscreen.isAvailable ? (
            <button
              type="button"
              className="stage-strip-button"
              onClick={fullscreen.toggle}
            >
              {fullscreen.isFullscreen ? 'Свернуть' : 'Во весь экран'}
            </button>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
