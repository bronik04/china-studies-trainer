import type { Attempt } from '../../domain/round';

export type RoundProgressTrailProps = {
  readonly total: number;
  readonly attempts: readonly Attempt[];
};

/** Знак несёт исход сам, без цвета: лента читается и в оттенках серого. */
const GLYPHS = { ahead: '○', correct: '✓', wrong: '●' } as const;

/**
 * Ход раунда одной лентой. Занимает колонку вопроса, которая иначе пустует: на
 * 1280×720 под блоком вопроса оставалось около 490 px из 690.
 *
 * Знаки `✓ ● ○` уже входят в подмножество `Noto Serif SC` (DESIGN_SYSTEM.md),
 * добавлять в шрифт нечего.
 *
 * `aria-hidden`: строка «Вопрос 7 из 34» сообщает то же самое словами, а 34
 * значка подряд в обходе с клавиатуры бесполезны.
 */
export function RoundProgressTrail({ total, attempts }: RoundProgressTrailProps) {
  return (
    <p className="round-trail" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => {
        const attempt = attempts[index];
        const mark =
          attempt === undefined ? 'ahead' : attempt.isCorrect ? 'correct' : 'wrong';

        return (
          <span key={index} data-mark={mark}>
            {GLYPHS[mark]}
          </span>
        );
      })}
    </p>
  );
}
