import { useState } from 'react';
import { citiesWord } from '../../content/region-count';
import type { City } from '../../content/types';
import { TWO_COLUMN_QUERY } from '../../design/breakpoints';
import { labelOf, langOf, type QuestionLanguage } from '../../domain/question-language';

/**
 * Начальное состояние блока — то же правило, что у списка регионов: в jsdom
 * `matchMedia` нет, и его отсутствие читается как узкий экран, чтобы проверки
 * ответа не зависели от вёрстки.
 */
function defaultOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return !window.matchMedia(TWO_COLUMN_QUERY).matches;
}

export type CityAnswerListProps = {
  readonly cities: readonly City[];
  readonly language: QuestionLanguage;
  readonly targetId: string;
  readonly answeredId: string | null;
  readonly disabled: boolean;
  readonly onSelect: (cityId: string) => void;
};

/**
 * Равнозначный список городов — второй способ ответить в «Найти город».
 *
 * Нужен по той же причине, что и список регионов: цель на карте бывает меньше
 * порога нажатия (на 320 px это все города разом), а ответить с клавиатуры и
 * через читалку экрана нужно всегда. Разметка и стили общие с ним — свёрнутый
 * блок и `.map-alternative` внутри: полсотни кнопок не должны занимать экран
 * там, где работает карта.
 *
 * Порядок — алфавитный по русскому имени: искать глазами среди полусотни
 * приходится именно так.
 */
export function CityAnswerList({
  cities,
  language,
  targetId,
  answeredId,
  disabled,
  onSelect,
}: CityAnswerListProps) {
  const [open, setOpen] = useState(defaultOpen);
  const ordered = [...cities].sort((left, right) =>
    left.nameRu.localeCompare(right.nameRu, 'ru'),
  );

  return (
    <details
      className="region-answer-list"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        Ответить из списка ({cities.length} {citiesWord(cities.length)})
      </summary>
      <ul className="map-alternative" aria-label="Список городов">
        {ordered.map((city) => (
          <li key={city.id}>
            <button
              type="button"
              data-city-id={city.id}
              data-result={
                answeredId === null
                  ? undefined
                  : city.id === targetId
                    ? 'correct'
                    : city.id === answeredId
                      ? 'incorrect'
                      : undefined
              }
              aria-disabled={disabled ? 'true' : undefined}
              onClick={() => {
                if (!disabled) {
                  onSelect(city.id);
                }
              }}
            >
              <span lang={langOf(language)}>{labelOf(city, language)}</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
