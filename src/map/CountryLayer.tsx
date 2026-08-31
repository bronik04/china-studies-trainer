import { countryById } from '../content/countries';
import { COUNTRY_SHAPES, DISPUTED_SHAPES } from './country-geometry';
import type { AnswerState } from './region-selection';

export type CountryLayerProps = {
  readonly selectedCountryId: string | null;
  readonly onSelect: (countryId: string) => void;
  /** В «найти страну» подписи видны, в «назвать страну» — нет: подпись и есть ответ. */
  readonly showsLabels?: boolean;
  /**
   * Отвечают ли нажатием по стране. В «назвать страну» ответ выбирается
   * кнопкой, и контуры перестают быть управлением: роль и фокус снимаются,
   * иначе читалка экрана объявит четырнадцать кнопок, которые ничего не
   * делают. Тот же довод, по которому роли нет у спорных участков.
   */
  readonly answers?: boolean;
  readonly answerStates?: Readonly<Record<string, AnswerState>>;
};

const NO_STATES: Readonly<Record<string, AnswerState>> = {};

/**
 * Слой сопредельных государств: четырнадцать стран за границей Китая.
 *
 * Рисуется порталом внутрь уже вставленной разметки карты — как слой городов и
 * физический, и по той же причине: система координат и увеличение достаются
 * ему от самой карты, а не подгоняются вторым `svg` поверх.
 *
 * Страны обрезаны рамкой карты и видны ободом: кадр кончается почти по границе
 * Китая. Это не изъян, а следствие того, что карта кадрирована по стране;
 * мелкие цели (Афганистан — 8.4 единицы) отвечаются из равнозначного списка,
 * как Гонконг и Макао.
 */
export function CountryLayer({
  selectedCountryId,
  onSelect,
  showsLabels = true,
  answers = true,
  answerStates = NO_STATES,
}: CountryLayerProps) {
  return (
    <g className="country-layer" data-labels={showsLabels}>
      {COUNTRY_SHAPES.map((shape) => {
        const country = countryById(shape.id);
        const answerState = answerStates[shape.id];

        return (
          <path
            key={shape.id}
            className="country"
            d={shape.d}
            data-country-id={shape.id}
            data-selected={shape.id === selectedCountryId}
            data-answer-state={answerState}
            role={answers ? 'button' : undefined}
            tabIndex={answers ? 0 : undefined}
            aria-label={`${country?.nameRu}, ${country?.nameZh}`}
            aria-disabled={answers && answerState ? true : undefined}
            onClick={answers ? () => onSelect(shape.id) : undefined}
            onKeyDown={
              answers
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(shape.id);
                    }
                  }
                : undefined
            }
          />
        );
      })}

      {/*
        Спорные участки идут поверх заливок и целью ответа не бывают: страна —
        цель, спор — обстоятельство. Роли и фокуса у них нет, иначе читалка
        экрана объявила бы управление, которое ничего не делает; нажатие они
        пропускают сквозь себя к стране под ними.
      */}
      {DISPUTED_SHAPES.map((shape) => (
        <path
          key={shape.id}
          className="country-disputed"
          d={shape.d}
          data-disputed-id={shape.id}
          aria-hidden="true"
        />
      ))}

      {showsLabels
        ? COUNTRY_SHAPES.map((shape) => {
            const country = countryById(shape.id);

            return (
              <text
                key={shape.id}
                className="country-label"
                x={shape.label[0]}
                y={shape.label[1]}
                textAnchor="middle"
                aria-hidden="true"
              >
                {country?.nameRu}
              </text>
            );
          })
        : null}

      {/*
        Штриховка недоступна программе чтения с экрана, поэтому спорные участки
        названы ещё и текстом. Слова взяты у источника: он сам говорит, кто
        участком управляет и кто его заявляет.
      */}
      <foreignObject className="country-disputed-note" width="1" height="1">
        <ul>
          {DISPUTED_SHAPES.map((shape) => (
            <li key={shape.id}>
              {shape.nameRu} — спорная территория: {shape.note}
            </li>
          ))}
        </ul>
      </foreignObject>
    </g>
  );
}
