import { dynasties, TIMELINE_TO } from '../../content/dynasties';
import { rowShare, snakeRows, snakeSegments, snakeTurns } from './snake-layout';

const rows = snakeRows(TIMELINE_TO);

it('кладёт четыре тысячи лет в четыре строки, туда и обратно', () => {
  expect(rows).toHaveLength(4);
  expect(rows.map((row) => row.reversed)).toEqual([false, true, false, true]);
  expect(rows.at(-1)?.to).toBe(TIMELINE_TO);
});

/* Решение владельца: на поворотах — Шан, Хань и Тан. */
it('через повороты идут Шан, Хань и Тан', () => {
  expect(snakeTurns(dynasties, rows).map((turn) => turn.dynastyId)).toEqual([
    'shang',
    'han',
    'tang',
  ]);
});

it('поворот стоит там, где кончается строка', () => {
  expect(snakeTurns(dynasties, rows).map((turn) => turn.side)).toEqual([
    'end',
    'start',
    'end',
  ]);
});

it('в обратной строке поздний год левее раннего', () => {
  const second = rows[1];

  expect(rowShare(second, second.from)).toBe(1);
  expect(rowShare(second, second.to)).toBe(0);
});

it('династия на повороте режется надвое, кнопку несёт длинный отрезок', () => {
  const han = snakeSegments(dynasties, rows).filter(
    (segment) => segment.dynastyId === 'han',
  );

  expect(han).toHaveLength(2);
  expect(han.filter((segment) => segment.primary)).toHaveLength(1);
  const primary = han.find((segment) => segment.primary)!;
  expect(primary.width).toBe(Math.max(...han.map((segment) => segment.width)));
});

/* Масштаб честный: тысяча лет — вся строка. */
it('ширина отрезка — его доля тысячелетия', () => {
  const qin = snakeSegments(dynasties, rows).find(
    (segment) => segment.dynastyId === 'qin',
  )!;

  expect(qin.width).toBeCloseTo(14 / 1000, 5);
});
