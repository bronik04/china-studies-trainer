import { expect, it } from 'vitest';
import { dynasties } from '../content/dynasties';
import { buildDynastyChoices } from './dynasty-choices';
import { CHOICE_COUNT } from './choices';
import { createSeededRandom } from './random';

function idsFor(targetId: string, seed = 7): string[] {
  return buildDynastyChoices(
    dynasties,
    targetId,
    createSeededRandom(seed),
  ).map(({ id }) => id);
}

it('даёт четыре варианта, среди них верный', () => {
  const ids = idsFor('tang');

  expect(ids).toHaveLength(CHOICE_COUNT);
  expect(ids).toContain('tang');
  expect(new Set(ids).size).toBe(CHOICE_COUNT);
});

/*
 * Отвлекающие — соседи по времени. Вопрос, где три чужих срока отстоят на
 * тысячелетия, решается без знания даты: далёкое отсеивается веком, а не
 * памятью. Суй должна отвлекаться Тан и Троецарствием, а не Ся.
 */
it('берёт в отвлекающие соседей по времени, а не дальних', () => {
  const ids = idsFor('sui');

  expect(ids).not.toContain('xia');
  expect(ids).not.toContain('shang');
  expect(ids.some((id) => id === 'tang' || id === 'three-kingdoms')).toBe(true);
});

it('не подсовывает выдуманных сроков: все варианты — настоящие династии', () => {
  const known = new Set(dynasties.map(({ id }) => id));

  for (const dynasty of dynasties) {
    for (const id of idsFor(dynasty.id)) {
      expect(known, `${dynasty.id}: чужой вариант ${id}`).toContain(id);
    }
  }
});

/* Один сид — один и тот же набор: раунд обязан быть воспроизводим. */
it('повторяется по сиду', () => {
  expect(idsFor('qing', 42)).toEqual(idsFor('qing', 42));
});

/*
 * Порядок вариантов не задаётся справочником: без перемешивания до сортировки
 * равноудалённые соседи выстраивались бы в одном и том же порядке, и на
 * четвёртой попытке кнопка «верная» оказывалась бы на прежнем месте.
 */
it('на разных сидах набор не один и тот же', () => {
  const sets = new Set(
    [1, 2, 3, 4, 5, 6].map((seed) => idsFor('han', seed).join(',')),
  );

  expect(sets.size).toBeGreaterThan(1);
});

it('не знает выдуманной династии', () => {
  expect(() =>
    buildDynastyChoices(dynasties, 'atlantis', createSeededRandom(1)),
  ).toThrow('Неизвестная династия');
});
