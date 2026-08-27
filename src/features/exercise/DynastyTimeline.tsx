import { spanLabel, TIMELINE_FROM, TIMELINE_TO } from '../../content/dynasties';
import type { Dynasty } from '../../content/types';

/**
 * Лента династий: четыре тысячи лет одной полосой.
 *
 * Полоса пропорциональна времени, а не равным долям. Это и есть то, чему
 * режим учит помимо дат: Чжоу правила восемь веков, Цинь — четырнадцать лет, и
 * при равных долях они выглядели бы одинаково, а лента врала бы о главном.
 * Плата за честность — узкие полосы у коротких династий: подпись под ними не
 * помещается и не ставится. Спрошенная подписана всегда, где бы она ни была.
 *
 * Разметкой, а не `<svg>`. Первая попытка была на SVG с
 * `preserveAspectRatio="none"` — единственным способом растянуть ленту на
 * ширину кадра, — и вместе с полосами он растягивал буквы: подписи выходили
 * вдвое выше нормального. В разметке ширина задаётся процентами, а текст
 * остаётся текстом.
 *
 * Лента не орган управления: отвечают кнопками под ней. Поэтому она
 * `aria-hidden` и не принимает ни фокус, ни нажатие — читалке экрана то же
 * самое говорят вопрос и варианты ответа, словами и точнее.
 */

/** Доля ширины, ниже которой подпись не помещается. */
const LABEL_MIN_SHARE = 0.055;

/** Метки шкалы: круглые даты, по которым глаз находит место на ленте. */
const TICKS = [-2000, -1000, 0, 1000, 2000] as const;

function tickLabel(year: number): string {
  if (year === 0) {
    return 'н. э.';
  }

  return year < 0 ? `${-year} до н. э.` : String(year);
}

function percent(value: number): string {
  return `${value * 100}%`;
}

/** Наименьший разрыв, который стоит подписывать: короче — надпись не влезет. */
const GAP_MIN_YEARS = 200;

/**
 * Промежутки между династиями. Пусты они не по недосмотру: с 280 по 581 год
 * единой державы не было, и лента обязана показать это пустотой, а не
 * растянутой соседней полосой.
 */
function gapsBetween(
  dynasties: readonly Dynasty[],
): readonly { readonly from: number; readonly to: number }[] {
  const gaps: { from: number; to: number }[] = [];

  for (let index = 1; index < dynasties.length; index += 1) {
    const from = dynasties[index - 1].to;
    const to = dynasties[index].from;

    if (to - from >= GAP_MIN_YEARS) {
      gaps.push({ from, to });
    }
  }

  return gaps;
}

export type DynastyTimelineProps = {
  readonly dynasties: readonly Dynasty[];
  /** Спрошенная династия: подсвечена и подписана всегда. */
  readonly highlightedId: string | null;
  /**
   * Показывать ли имена. В вопросе лента молчит — иначе она и есть ответ; имя
   * появляется вместе с разбором.
   */
  readonly showsNames: boolean;
};

export function DynastyTimeline({
  dynasties,
  highlightedId,
  showsNames,
}: DynastyTimelineProps) {
  const span = TIMELINE_TO - TIMELINE_FROM;
  const shareOf = (year: number) => (year - TIMELINE_FROM) / span;

  return (
    <div className="dynasty-timeline" aria-hidden="true">
      <div className="timeline-scale">
        {TICKS.map((year) => (
          <span
            key={year}
            className="timeline-tick"
            style={{ left: percent(shareOf(year)) }}
            /*
             * Крайние метки прижимаются к своему краю, а не центрируются по
             * штриху: «2000 до н. э.» на левом конце иначе наполовину уезжает
             * за кадр.
             */
            data-edge={year === TICKS[0] ? 'start' : year === TICKS.at(-1) ? 'end' : undefined}
          >
            {tickLabel(year)}
          </span>
        ))}

        {/*
          Разрыв между династиями — не пропущенная полоса, а четыре века, когда
          единой державы не было. Без подписи пустота читается как недостача
          данных, и объяснять её пришлось бы каждому.

          Подпись стоит над разрывом, в строке шкалы, а не внутри него: сам
          разрыв — 301 год из четырёх тысяч, на широком экране слово помещается
          в него впритык, а на узком уже налезло бы на соседние полосы. Разрывы
          считаются по самим династиям: подпись и лента обязаны говорить об
          одном и том же промежутке.
        */}
        {showsNames
          ? gapsBetween(dynasties).map((gap) => (
              <span
                key={gap.from}
                className="timeline-gap"
                style={{ left: percent(shareOf((gap.from + gap.to) / 2)) }}
              >
                раздробленность
              </span>
            ))
          : null}
      </div>

      <div className="timeline-band">
        {dynasties.map((dynasty) => {
          const left = shareOf(dynasty.from);
          const width = shareOf(dynasty.to) - left;
          const highlighted = dynasty.id === highlightedId;

          return (
            <div
              key={dynasty.id}
              className="timeline-span"
              data-highlighted={highlighted}
              style={{ left: percent(left), width: percent(width) }}
            />
          );
        })}
      </div>

      <div className="timeline-names">
        {dynasties.map((dynasty) => {
          const left = shareOf(dynasty.from);
          const width = shareOf(dynasty.to) - left;
          const highlighted = dynasty.id === highlightedId;
          /*
           * Имя ставится там, где помещается, — либо у спрошенной династии,
           * где бы она ни была. У Цинь полоса в четырнадцать лет: подпись под
           * ней налезла бы на соседей, и вместо ленты вышла бы каша.
           */
          if (!showsNames || (!highlighted && width < LABEL_MIN_SHARE)) {
            return null;
          }

          return (
            <span
              key={dynasty.id}
              className="timeline-name"
              data-highlighted={highlighted}
              style={{ left: percent(left + width / 2) }}
            >
              {dynasty.nameRu}
              {highlighted ? (
                <span className="timeline-name-years">{spanLabel(dynasty)}</span>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
