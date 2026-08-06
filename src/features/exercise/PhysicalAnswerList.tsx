import { useState } from 'react';
import { featuresWord } from '../../content/region-count';
import type { PhysicalFeature } from '../../content/types';
import { TWO_COLUMN_QUERY } from '../../design/breakpoints';
import { labelOf, langOf, type QuestionLanguage } from '../../domain/question-language';

/**
 * Начальное состояние блока — то же правило, что у списков регионов и
 * городов: в jsdom `matchMedia` нет, и его отсутствие читается как узкий
 * экран, чтобы проверки ответа не зависели от вёрстки.
 */
function defaultOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return !window.matchMedia(TWO_COLUMN_QUERY).matches;
}

export type PhysicalAnswerListProps = {
  readonly features: readonly PhysicalFeature[];
  readonly language: QuestionLanguage;
  readonly targetId: string;
  readonly answeredId: string | null;
  readonly disabled: boolean;
  readonly onSelect: (featureId: string) => void;
};

/**
 * Равнозначный список объектов — второй способ ответить в «Найти на
 * физической карте».
 *
 * Нужен не только на узком экране: река шириной в волос не цель ни при каком
 * разведении на 320 px, а ответить с клавиатуры и через читалку экрана нужно
 * всегда. Разметка и стили общие со списками регионов и городов.
 *
 * Порядок — алфавитный по русскому имени, реки и формы вперемешку: разделять
 * их значило бы подсказывать вид ответа.
 */
export function PhysicalAnswerList({
  features,
  language,
  targetId,
  answeredId,
  disabled,
  onSelect,
}: PhysicalAnswerListProps) {
  const [open, setOpen] = useState(defaultOpen);
  const ordered = [...features].sort((left, right) =>
    left.nameRu.localeCompare(right.nameRu, 'ru'),
  );

  return (
    <details
      className="region-answer-list"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        Ответить из списка ({features.length} {featuresWord(features.length)})
      </summary>
      <ul className="map-alternative" aria-label="Список объектов">
        {ordered.map((feature) => (
          <li key={feature.id}>
            <button
              type="button"
              data-feature-id={feature.id}
              data-result={
                answeredId === null
                  ? undefined
                  : feature.id === targetId
                    ? 'correct'
                    : feature.id === answeredId
                      ? 'incorrect'
                      : undefined
              }
              aria-disabled={disabled ? 'true' : undefined}
              onClick={() => {
                if (!disabled) {
                  onSelect(feature.id);
                }
              }}
            >
              <span lang={langOf(language)}>{labelOf(feature, language)}</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
