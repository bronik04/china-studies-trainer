import { regions } from '../content/regions';
import { labelOf, REPRESENTATIONS_BY_LEVEL, representationsFor } from './representations';

const sichuan = regions.find((region) => region.id === 'sichuan')!;

it('подписывает регион каждым представлением', () => {
  expect(labelOf(sichuan, 'name-ru')).toBe('Сычуань');
  expect(labelOf(sichuan, 'name-zh')).toBe('四川省');
  expect(labelOf(sichuan, 'pinyin')).toBe(sichuan.pinyin);
  expect(labelOf(sichuan, 'capital')).toBe('Чэнду');
});

it('растит сложность от уровня к уровню', () => {
  expect(REPRESENTATIONS_BY_LEVEL[1]).toEqual(['name-ru']);
  expect(REPRESENTATIONS_BY_LEVEL[2]).toEqual(['name-zh']);
  expect(REPRESENTATIONS_BY_LEVEL[3]).toEqual(['pinyin', 'capital']);
  expect(REPRESENTATIONS_BY_LEVEL[4]).toHaveLength(4);
});

it('не даёт вопросу «регион — столица» показывать собственный ответ', () => {
  expect(representationsFor(3, 'match-capital')).toEqual(['pinyin']);
  expect(representationsFor(4, 'match-capital')).not.toContain('capital');
});

it('оставляет столицу доступной остальным заданиям', () => {
  expect(representationsFor(3, 'find-on-map')).toContain('capital');
  expect(representationsFor(3, 'name-region')).toContain('capital');
});

it('никогда не оставляет задание без представления', () => {
  const levels = [1, 2, 3, 4] as const;
  const types = ['find-on-map', 'name-region', 'match-capital'] as const;

  for (const level of levels) {
    for (const type of types) {
      expect(representationsFor(level, type).length).toBeGreaterThan(0);
    }
  }
});
