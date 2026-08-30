import type { Country } from '../../content/countries';
import { labelOf, langOf, type QuestionLanguage } from '../../domain/question-language';

export type CountryAnswerListProps = {
  readonly countries: readonly Country[];
  readonly language: QuestionLanguage;
  readonly targetId: string;
  readonly answeredId: string | null;
  readonly disabled: boolean;
  readonly onSelect: (countryId: string) => void;
};

/**
 * Равнозначный список стран — второй способ ответить в «Найти страну».
 *
 * Нужен по той же причине, что списки регионов и городов, и здесь она особенно
 * наглядна: кадр карты обрезан по Китаю, и у Афганистана в него заходит только
 * Ваханский коридор — 8.4 единицы viewBox, вчетверо меньше порога нажатия.
 * Указателем в него не попасть, а ответить надо.
 *
 * Порядок — алфавитный по русскому имени: искать глазами приходится именно так.
 */
export function CountryAnswerList({
  countries,
  language,
  targetId,
  answeredId,
  disabled,
  onSelect,
}: CountryAnswerListProps) {
  const ordered = [...countries].sort((left, right) =>
    left.nameRu.localeCompare(right.nameRu, 'ru'),
  );

  return (
    <ul className="map-alternative" aria-label="Список стран">
      {ordered.map((country) => (
        <li key={country.id}>
          <button
            type="button"
            data-country-id={country.id}
            data-result={
              answeredId === null
                ? undefined
                : country.id === targetId
                  ? 'correct'
                  : country.id === answeredId
                    ? 'incorrect'
                    : undefined
            }
            aria-disabled={disabled ? 'true' : undefined}
            onClick={() => {
              if (!disabled) {
                onSelect(country.id);
              }
            }}
          >
            <span lang={langOf(language)}>{labelOf(country, language)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
