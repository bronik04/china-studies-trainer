import type { City } from '../../content/types';
import { labelOf, langOf, type QuestionLanguage } from '../../domain/question-language';

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
 * через читалку экрана нужно всегда. Разметка и стили общие с ним —
 * `.map-alternative`. На экране раунда список стоит в панели `RoundStage`
 * («Ответить из списка»), которая открывается и закрывается снаружи.
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
  const ordered = [...cities].sort((left, right) =>
    left.nameRu.localeCompare(right.nameRu, 'ru'),
  );

  return (
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
  );
}
