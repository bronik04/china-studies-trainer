import { useEffect, useRef } from 'react';
import type { Region } from '../../content/types';

export type AnswerFeedbackProps = {
  readonly isCorrect: boolean;
  readonly targetRegion: Region;
  readonly isLastQuestion: boolean;
  readonly onNext: () => void;
};

/**
 * Результат вопроса: значок, заголовок и пояснение. Тон поддерживающий —
 * вместо «Ты ошибся» говорится, что регион стоит повторить (UI_UX.md).
 * Фокус переводится на заголовок, чтобы результат был объявлен и доступен
 * с клавиатуры.
 */
export function AnswerFeedback({
  isCorrect,
  targetRegion,
  isLastQuestion,
  onNext,
}: AnswerFeedbackProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [targetRegion.id]);

  const title = isCorrect ? 'Верно' : 'Этот регион стоит повторить';

  return (
    <section
      className="answer-feedback"
      data-result={isCorrect ? 'correct' : 'incorrect'}
      aria-labelledby="answer-feedback-heading"
    >
      <p className="answer-feedback-icon" role="img" aria-label={title}>
        {isCorrect ? '✓' : '↻'}
      </p>
      <h3 id="answer-feedback-heading" ref={headingRef} tabIndex={-1}>
        {title}
      </h3>
      <p>
        Правильный ответ: {targetRegion.nameRu}{' '}
        <span lang="zh-Hans">{targetRegion.nameZh}</span>.
      </p>
      <p>
        Административный центр: {targetRegion.capitalRu}{' '}
        <span lang="zh-Hans">({targetRegion.capitalZh})</span>.
      </p>
      <button type="button" className="primary" onClick={onNext}>
        {isLastQuestion ? 'Завершить раунд' : 'Далее'}
      </button>
    </section>
  );
}
