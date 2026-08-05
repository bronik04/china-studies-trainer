import { useEffect, useRef } from 'react';
import { cityById } from '../../content/cities';
import type { Region } from '../../content/types';

export type AnswerFeedbackProps = {
  readonly targetRegion: Region;
  readonly isLastQuestion: boolean;
  readonly onNext: () => void;
};

/**
 * Разбор ошибки: значок, заголовок и правильный ответ. Тон поддерживающий —
 * вместо «Ты ошибся» говорится, что регион стоит повторить (UI_UX.md).
 * Фокус переводится на заголовок, чтобы результат был объявлен и доступен
 * с клавиатуры.
 *
 * Ветки «Верно» здесь нет: верный ответ не останавливает раунд и ничего не
 * объясняет — ученик только что показал это сам.
 */
export function AnswerFeedback({
  targetRegion,
  isLastQuestion,
  onNext,
}: AnswerFeedbackProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [targetRegion.id]);

  const capital = cityById(targetRegion.capitalCityId);
  const title = 'Этот регион стоит повторить';

  return (
    <section
      className="answer-feedback"
      data-result="incorrect"
      aria-labelledby="answer-feedback-heading"
    >
      <p className="answer-feedback-icon" role="img" aria-label={title}>
        ↻
      </p>
      <h3 id="answer-feedback-heading" ref={headingRef} tabIndex={-1}>
        {title}
      </h3>
      <p>
        Правильный ответ: {targetRegion.nameRu}{' '}
        <span lang="zh-Hans">{targetRegion.nameZh}</span>.
      </p>
      <p>
        Административный центр: {capital?.nameRu}{' '}
        <span lang="zh-Hans">({capital?.nameZh})</span>.
      </p>
      <button type="button" className="primary" onClick={onNext}>
        {isLastQuestion ? 'Завершить раунд' : 'Далее'}
      </button>
    </section>
  );
}
