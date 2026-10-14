import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { spanLabel, TIMELINE_TO } from '../../content/dynasties';
import type { Dynasty } from '../../content/types';
import { rowShare, snakeRows, snakeSegments, snakeTurns } from './snake-layout';
import { hitAreas, minHitShare } from './timeline-hit';

/**
 * Лента династий: четыре тысячи лет змейкой — строка на тысячу лет, туда и
 * обратно (DECISIONS.md, 2026-10-14; раскладку считает `snake-layout.ts`).
 * Прежде лента шла одной полосой, и в ней Цинь занимала 3.6 px.
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

function tickLabel(year: number): string {
  if (year === 0) {
    return 'н. э.';
  }

  return year < 0 ? `${-year} до н. э.` : String(year);
}

function percent(value: number): string {
  return `${value * 100}%`;
}

const ROWS = snakeRows(TIMELINE_TO);

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

    /*
     * Меряется строка, а не вся лента: строка уже ленты на два поворота, а
     * ширина поворота на телефоне другая (`--timeline-turn` в styles.css).
     */
    const apply = () =>
      setWidth(
        (node.querySelector('.timeline-band') ?? node).getBoundingClientRect()
          .width,
      );

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
  /**
   * `correct` и `wrong` — исход ответа. `asked` — «вот эта династия»: её
   * показывают в играх, где спрашивают не о времени (столица, правитель), и
   * подпись там не утечка — ответом служит город или человек. `taken` — полоса
   * занята уже поставленным именем: она подписана и нажатий не принимает.
   */
  readonly kind: 'correct' | 'wrong' | 'asked' | 'taken';
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
  const markOf = (dynastyId: string) =>
    marks.find((mark) => mark.dynastyId === dynastyId)?.kind;

  /* Ширина одной строки змейки — её меряет `useRibbonWidth`. */
  const [ribbonRef, ribbonWidth] = useRibbonWidth();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const answers = onAnswer !== undefined;

  /*
   * Раскладка зависит только от справочника, а перерисовка идёт на каждое
   * наведение — считать её заново незачем.
   */
  const { segments, turns, gaps } = useMemo(
    () => ({
      segments: snakeSegments(dynasties, ROWS),
      turns: snakeTurns(dynasties, ROWS),
      gaps: gapsBetween(dynasties),
    }),
    [dynasties],
  );
  const byId = useMemo(
    () => new Map(dynasties.map((dynasty) => [dynasty.id, dynasty])),
    [dynasties],
  );

  /*
   * Наведение живёт только пока лента отвечает. Иначе после ответа строка
   * разбора оставалась бы подменённой сроком: курсор со сданной полосы никуда
   * не делся, а цели под ним уже нет.
   *
   * Занятая полоса из наведения выпадает: её кнопка выключена, а выключенная
   * не шлёт `pointerleave` — иначе `hoveredId` застревал бы на ней навсегда, и
   * строка под лентой продолжала бы показывать её срок (ревью 2026-08-28).
   */
  const hovered = answers
    ? dynasties.find(
        (dynasty) =>
          dynasty.id === hoveredId && markOf(dynasty.id) !== 'taken',
      )
    : undefined;
  const spanMark = (dynastyId: string) =>
    markOf(dynastyId) ?? (hovered?.id === dynastyId ? 'hover' : undefined);

  return (
    <div
      className="dynasty-timeline"
      data-layout="snake"
      ref={ribbonRef}
      aria-hidden={answers ? undefined : true}
    >
      {ROWS.map((row) => {
        const inRow = segments
          .filter((segment) => segment.row === row.index)
          .sort((a, b) => a.left - b.left);
        /*
         * Цели нажатия считаются по строке: в ней свои двенадцать или меньше
         * полос, и порог 44 px делится на ширину строки, а не всей ленты.
         * Пока ширина неизвестна (нулевая до первого кадра), порог нулевой и
         * цель совпадает с полосой.
         */
        const hits = !answers
          ? []
          : hitAreas(
              inRow.map((segment) => ({
                id: segment.dynastyId,
                left: segment.left,
                width: segment.width,
              })),
              ribbonWidth === 0 ? 0 : minHitShare(ribbonWidth, inRow.length),
            );
        const turn = turns.find((item) => item.afterRow === row.index);

        return (
          <div
            key={row.index}
            className="timeline-row"
            data-reversed={row.reversed}
          >
            <div className="timeline-scale">
              {/*
                Год начала строки — у её начала: слева у прямой строки, справа
                у обратной. Стрелка говорит, куда идёт время.
              */}
              <span
                className="timeline-tick"
                data-edge={row.reversed ? 'end' : 'start'}
                style={{ left: percent(row.reversed ? 1 : 0) }}
              >
                {row.reversed ? '← ' : ''}
                {tickLabel(row.from)}
                {row.reversed ? '' : ' →'}
              </span>
              {row.index === ROWS.length - 1 ? (
                <span
                  className="timeline-tick"
                  data-edge={row.reversed ? 'start' : 'end'}
                  style={{ left: percent(row.reversed ? 0 : 1) }}
                >
                  {tickLabel(row.to)}
                </span>
              ) : null}

              {/*
                Разрыв между династиями — не пропущенная полоса, а четыре века,
                когда единой державы не было. Подпись стоит над разрывом, в
                строке шкалы: сам разрыв для слова узок.
              */}
              {showsNames
                ? gaps
                    .filter((gap) => {
                      const middle = (gap.from + gap.to) / 2;
                      return middle >= row.from && middle < row.to;
                    })
                    .map((gap) => (
                      <span
                        key={gap.from}
                        className="timeline-gap"
                        style={{
                          left: percent(rowShare(row, (gap.from + gap.to) / 2)),
                        }}
                      >
                        раздробленность
                      </span>
                    ))
                : null}
            </div>

            <div className="timeline-band">
              {inRow.map((segment) => (
                <div
                  key={segment.dynastyId}
                  className="timeline-span"
                  data-dynasty-id={segment.dynastyId}
                  data-mark={spanMark(segment.dynastyId)}
                  style={{
                    left: percent(segment.left),
                    width: percent(segment.width),
                  }}
                />
              ))}

              {/*
                Слой целей нажатия поверх полос. Полоса нарисована честно, по
                годам, а нажимают её пальцем: у Цинь она 14 лет из тысячи.
                Кнопку с именем несёт главный отрезок династии; второй, за
                поворотом, тоже нажимается, но скрыт от читалки и от Tab —
                двух одинаковых кнопок на одну династию быть не должно.
              */}
              {answers ? (
                <div className="timeline-hits">
                  {hits.map((hit) => {
                    const dynasty = byId.get(hit.id)!;
                    const isPrimary =
                      inRow.find((segment) => segment.dynastyId === hit.id)
                        ?.primary ?? true;

                    return (
                      <button
                        key={hit.id}
                        type="button"
                        className="timeline-hit"
                        data-hit-dynasty-id={hit.id}
                        /*
                         * Занятая полоса выключена, а не просто молчит:
                         * выключенная кнопка сама выпадает из обхода
                         * клавиатурой, и читалка называет её недоступной.
                         */
                        disabled={markOf(hit.id) === 'taken'}
                        aria-hidden={isPrimary ? undefined : true}
                        tabIndex={isPrimary ? undefined : -1}
                        style={{
                          left: percent(hit.left),
                          width: percent(hit.width),
                        }}
                        onPointerEnter={() => setHoveredId(hit.id)}
                        onPointerLeave={() => setHoveredId(null)}
                        onFocus={() => setHoveredId(hit.id)}
                        onBlur={() => setHoveredId(null)}
                        onClick={() => onAnswer?.(hit.id)}
                      >
                        {isPrimary ? (
                          <span className="visually-hidden">
                            {spanLabel(dynasty)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="timeline-names">
              {inRow
                .filter((segment) => segment.primary)
                .map((segment) => {
                  const dynasty = byId.get(segment.dynastyId)!;
                  /*
                   * Выделенная подпись со сроком — только у верной полосы.
                   * Выбранную по ошибке называет строка разбора: две
                   * выделенные подписи рядом налезали бы друг на друга.
                   */
                  const mark = markOf(dynasty.id);
                  const isAnswer = mark === 'correct';
                  /*
                   * Спрошенная и занятая подписаны и тогда, когда лента в
                   * целом молчит: первая называет, о ком речь, вторая — что
                   * место закрыто.
                   */
                  const isAsked = mark === 'asked' || mark === 'taken';

                  if (!showsNames && !isAsked) {
                    return null;
                  }

                  /*
                   * Имя ставится там, где помещается, — либо у помеченной
                   * династии, где бы она ни была: у Цинь полоса в 14 лет, и
                   * подпись под ней налезла бы на соседей.
                   */
                  if (!isAnswer && !isAsked && segment.width < LABEL_MIN_SHARE) {
                    return null;
                  }

                  /*
                   * Прижимать подпись к краю, как у прежней ленты в одну
                   * полосу, незачем: в змейке ни один главный отрезок не
                   * стоит у края строки (центры от 0.13 до 0.86).
                   */
                  const centre = segment.left + segment.width / 2;

                  return (
                    <span
                      key={dynasty.id}
                      className="timeline-name"
                      data-mark={isAnswer || isAsked ? mark : undefined}
                      style={{ left: percent(centre) }}
                    >
                      <span lang="zh-Hans" className="timeline-name-han">
                        {dynasty.nameZh}
                      </span>{' '}
                      {dynasty.nameRu}
                      {isAnswer ? (
                        <span className="timeline-name-years">
                          {spanLabel(dynasty)}
                        </span>
                      ) : null}
                    </span>
                  );
                })}
            </div>

            {/*
              Поворот змейки. Если через рубеж идёт династия — он её цвета и
              продолжает её полосу: время на повороте не прерывается.
            */}
            {turn === undefined ? null : (
              <span
                className="timeline-turn"
                data-side={turn.side}
                data-turn-dynasty-id={turn.dynastyId ?? undefined}
                data-mark={
                  turn.dynastyId === null ? undefined : spanMark(turn.dynastyId)
                }
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}

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
