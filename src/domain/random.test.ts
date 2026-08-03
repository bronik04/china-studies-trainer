import { createSeededRandom, shuffle } from './random';

it('выдаёт одну и ту же последовательность для одного seed', () => {
  const first = createSeededRandom(42);
  const second = createSeededRandom(42);

  const left = [first(), first(), first()];
  const right = [second(), second(), second()];

  expect(left).toEqual(right);
});

it('выдаёт разные последовательности для разных seed', () => {
  const first = createSeededRandom(1);
  const second = createSeededRandom(2);

  expect(first()).not.toBe(second());
});

it('держит значения в промежутке от нуля включительно до единицы', () => {
  const random = createSeededRandom(7);

  for (let i = 0; i < 500; i += 1) {
    const value = random();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  }
});

it('перемешивает, сохраняя состав', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  const shuffled = shuffle(items, createSeededRandom(3));

  expect([...shuffled].sort()).toEqual([...items].sort());
  expect(shuffled).toHaveLength(items.length);
});

it('не изменяет исходный массив', () => {
  const items = ['a', 'b', 'c'];

  shuffle(items, createSeededRandom(3));

  expect(items).toEqual(['a', 'b', 'c']);
});

it('перемешивает одинаково при одном seed', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f'];

  expect(shuffle(items, createSeededRandom(9))).toEqual(
    shuffle(items, createSeededRandom(9)),
  );
});
