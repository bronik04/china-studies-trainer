/**
 * Цели нажатия для полос ленты династий.
 *
 * Полоса Цинь — четырнадцать лет из четырёх тысяч: на ленте шириной 1024 px
 * это 3.6 px, а правило проекта — 44 px (`--target-min`). Поэтому цель отделена
 * от полосы: полоса остаётся нарисованной честно, по годам, а цель расширяется
 * и разъезжается с соседями. Тот же приём, что у точек городов на карте, только
 * в одном измерении — и потому разводка здесь сходится всегда: цели идут слева
 * направо и не могут обогнать друг друга.
 */
export type TimelineSpan = {
  readonly id: string;
  /** Доля ширины ленты: 0 — левый край, 1 — правый. */
  readonly left: number;
  readonly width: number;
};

/**
 * Порог в долях ширины. Когда 44 px на всех не хватает — а на экране в 375 px
 * двенадцати целям нужно 528, — порог опускается до равной доли: обещать
 * недостижимое нельзя, а гарантированный путь к ответу и так есть, это кнопки
 * вариантов под лентой.
 */
export function minHitShare(widthPx: number, count: number): number {
  return Math.min(44 / widthPx, 1 / count);
}

export function hitAreas(
  spans: readonly TimelineSpan[],
  minShare: number,
): readonly TimelineSpan[] {
  const hits: TimelineSpan[] = [];
  let cursor = 0;

  for (const [index, span] of spans.entries()) {
    const width = Math.max(span.width, minShare);
    /* Цель хочет стоять по центру своей полосы: так рука попадает туда, куда целится. */
    const wanted = span.left + span.width / 2 - width / 2;
    /* Сколько места обязаны оставить тем, кто правее. */
    const tail = spans
      .slice(index + 1)
      .reduce((sum, next) => sum + Math.max(next.width, minShare), 0);
    const left = Math.min(Math.max(wanted, cursor), 1 - tail - width);

    hits.push({ id: span.id, left, width });
    cursor = left + width;
  }

  return hits;
}
