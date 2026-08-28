import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { spanLabel, TIMELINE_FROM, TIMELINE_TO } from '../../content/dynasties';
import type { Dynasty } from '../../content/types';
import { hitAreas, minHitShare } from './timeline-hit';

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
 * Лента отвечает, когда ей дан `onAnswer`, — и тогда полосы становятся
 * кнопками, названными сроком, а не именем династии: имя и есть ответ. Без
 * колбэка она остаётся картинкой: `aria-hidden`, ни фокуса, ни нажатия, —
 * читалке экрана то же самое говорят вопрос и варианты ответа, словами и
 * точнее.
 */

/** Доля ширины, ниже которой подпись не помещается. */
const LABEL_MIN_SHARE = 0.055;

/**
 * Насколько близко к краю ленты подпись перестаёт центрироваться. Ширина
 * подписи «Ся ок. 2070–ок. 1600 до н. э.» — около десятой доли ленты, и
 * половина её уезжает за обрез, если центрировать по полосе у самого края.
 */
const EDGE_SHARE = 0.06;

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

/**
 * Ширина ленты в пикселях. Нужна одному — порогу целей нажатия: на узком
 * экране 44 px не помещаются двенадцать раз, и порог обязан это знать.
 * `ResizeObserver`, а не разовый замер: ленту тянет ширина кадра, и при смене
 * ширины цели надо развести заново.
 */
function useRibbonWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) {
      return;
    }

    const apply = () => setWidth(node.getBoundingClientRect().width);

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/**
 * Помеченная полоса. Метка несёт исход, а не факт «о ней спрашивали»: прежде
 * лента красила спрошенную киноварью при любом ответе, и верный ответ читался
 * как ошибка (решение владельца продукта, DECISIONS.md, 2026-08-28).
 */
export type TimelineMark = {
  readonly dynastyId: string;
  readonly kind: 'correct' | 'wrong';
};

export type DynastyTimelineProps = {
  readonly dynasties: readonly Dynasty[];
  /**
   * Верный ответ — одна метка. Ошибка — две: верная полоса и выбранная, и
   * расстояние между ними показывает величину промаха.
   */
  readonly marks?: readonly TimelineMark[];
  /**
   * Показывать ли имена. В вопросе лента молчит — иначе она и есть ответ; имя
   * появляется вместе с разбором.
   */
  readonly showsNames: boolean;
  /**
   * Ответ нажатием по ленте. Пока его нет, лента — картинка: она ничего не
   * делает, и читалке экрана говорить о ней нечего.
   */
  readonly onAnswer?: (dynastyId: string) => void;
  /** Строка под лентой. Наведение на полосу подменяет её сроком. */
  readonly hint?: ReactNode;
};

export function DynastyTimeline({
  dynasties,
  marks = [],
  showsNames,
  onAnswer,
  hint,
}: DynastyTimelineProps) {
  const span = TIMELINE_TO - TIMELINE_FROM;
  const shareOf = (year: number) => (year - TIMELINE_FROM) / span;
  const markOf = (dynastyId: string) =>
    marks.find((mark) => mark.dynastyId === dynastyId)?.kind;

  const [ribbonRef, ribbonWidth] = useRibbonWidth();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const answers = onAnswer !== undefined;

  /*
   * Цели есть, как только лента отвечает, — и до первого измерения тоже: без
   * ширины их нельзя расширить, но нельзя и не показать. Пока ширина
   * неизвестна (нулевая до первого кадра), порог нулевой и цель совпадает с
   * полосой; после замера цели расширяются и разъезжаются.
   */
  const hits = !answers
    ? []
    : hitAreas(
        dynasties.map((dynasty) => ({
          id: dynasty.id,
          left: shareOf(dynasty.from),
          width: shareOf(dynasty.to) - shareOf(dynasty.from),
        })),
        ribbonWidth === 0 ? 0 : minHitShare(ribbonWidth, dynasties.length),
      );

  /*
   * Наведение живёт только пока лента отвечает. Иначе после ответа строка
   * разбора оставалась бы подменённой сроком: курсор со сданной полосы никуда
   * не делся, а цели под ним уже нет.
   */
  const hovered = answers
    ? dynasties.find((dynasty) => dynasty.id === hoveredId)
    : undefined;

  return (
    <div
      className="dynasty-timeline"
      ref={ribbonRef}
      aria-hidden={answers ? undefined : true}
    >
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

          return (
            <div
              key={dynasty.id}
              className="timeline-span"
              data-dynasty-id={dynasty.id}
              data-mark={
                markOf(dynasty.id) ??
                (hovered?.id === dynasty.id ? 'hover' : undefined)
              }
              style={{ left: percent(left), width: percent(width) }}
            />
          );
        })}

        {/*
          Слой целей нажатия поверх полос. Полоса нарисована честно, по годам,
          а нажимают её пальцем: у Цинь она 3.6 px на ленте в 1024. Цель имеет
          своё положение и своё имя — срок, — и потому она кнопка, а полоса
          остаётся рисунком.
        */}
        {answers ? (
          <div className="timeline-hits">
            {hits.map((hit) => {
              const dynasty = dynasties.find((item) => item.id === hit.id)!;

              return (
                <button
                  key={hit.id}
                  type="button"
                  className="timeline-hit"
                  data-hit-dynasty-id={hit.id}
                  style={{ left: percent(hit.left), width: percent(hit.width) }}
                  onPointerEnter={() => setHoveredId(hit.id)}
                  onPointerLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(hit.id)}
                  onBlur={() => setHoveredId(null)}
                  onClick={() => onAnswer?.(hit.id)}
                >
                  <span className="visually-hidden">{spanLabel(dynasty)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="timeline-names">
        {dynasties.map((dynasty) => {
          const left = shareOf(dynasty.from);
          const width = shareOf(dynasty.to) - left;
          /*
           * Выделенная подпись со сроком — только у верной полосы. Выбранную
           * по ошибке называет строка разбора: две выделенные подписи рядом
           * налезали бы друг на друга, а у Тан и Сун они рядом.
           */
          const isAnswer = markOf(dynasty.id) === 'correct';
          /*
           * Имя ставится там, где помещается, — либо у верной династии, где бы
           * она ни была. У Цинь полоса в четырнадцать лет: подпись под ней
           * налезла бы на соседей, и вместо ленты вышла бы каша.
           */
          if (!showsNames || (!isAnswer && width < LABEL_MIN_SHARE)) {
            return null;
          }

          /*
           * Крайние подписи прижимаются к своему краю, а не центрируются по
           * полосе: подпись Ся начинается у нуля ленты, и половина её уезжала
           * за обрез. Тот же приём, что у крайних меток шкалы.
           */
          const centre = left + width / 2;

          return (
            <span
              key={dynasty.id}
              className="timeline-name"
              data-mark={isAnswer ? 'correct' : undefined}
              data-edge={
                centre < EDGE_SHARE
                  ? 'start'
                  : centre > 1 - EDGE_SHARE
                    ? 'end'
                    : undefined
              }
              style={{ left: percent(centre) }}
            >
              {dynasty.nameRu}
              {isAnswer ? (
                <span className="timeline-name-years">{spanLabel(dynasty)}</span>
              ) : null}
            </span>
          );
        })}
      </div>

      {/*
        Строка под лентой. Наведение и фокус подменяют её сроком полосы: на
        самой полосе подпись не помещается — у Цинь она четырнадцать лет.
      */}
      {hint === undefined && hovered === undefined ? null : (
        <div className="timeline-hint">
          {hovered === undefined ? (
            hint
          ) : (
            <p className="history-hint">
              {spanLabel(hovered)} · нажмите, чтобы ответить
            </p>
          )}
        </div>
      )}
    </div>
  );
}
