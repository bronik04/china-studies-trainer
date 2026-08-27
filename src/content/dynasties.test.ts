import { expect, it } from 'vitest';
import {
  dynasties,
  dynastyById,
  spanLabel,
  spanYears,
  TIMELINE_FROM,
  TIMELINE_TO,
} from './dynasties';
import { sourceById } from './sources';

it('идёт по времени и не путает начало с концом', () => {
  for (const dynasty of dynasties) {
    expect(dynasty.to, dynasty.id).toBeGreaterThan(dynasty.from);
  }

  const starts = dynasties.map(({ from }) => from);

  expect(starts).toEqual([...starts].sort((left, right) => left - right));
});

/*
 * Наложение сроков — обычно ошибка набора, но не всегда. Юань провозглашена в
 * 1271 году, а Южная Сун держалась до 1279-го: восемь лет они и правда
 * существовали разом, в разных концах страны. Такое наложение здесь одно, оно
 * названо, и новое — случайное — тест поймает.
 *
 * На вопрос это не влияет: у каждой династии свой срок, и верный ответ
 * остаётся один.
 */
const KNOWN_OVERLAPS = new Set(['song→yuan']);

it('не даёт династиям накладываться, кроме известного случая', () => {
  const overlaps: string[] = [];

  for (let index = 1; index < dynasties.length; index += 1) {
    const previous = dynasties[index - 1];
    const current = dynasties[index];

    if (current.from < previous.to) {
      overlaps.push(`${previous.id}→${current.id}`);
    }
  }

  expect(overlaps).toEqual([...KNOWN_OVERLAPS]);
});

it('называет срок словами, а не числами', () => {
  expect(spanLabel(dynastyById('qin')!)).toBe('221–207 до н. э.');
  expect(spanLabel(dynastyById('han')!)).toBe('206 до н. э. — 220 н. э.');
  expect(spanLabel(dynastyById('ming')!)).toBe('1368–1644');
});

/* Приблизительность видна в подписи, а не прячется за точным числом. */
it('отмечает условные даты словом «ок.»', () => {
  expect(spanLabel(dynastyById('xia')!)).toBe('ок. 2070–ок. 1600 до н. э.');
  expect(spanLabel(dynastyById('shang')!)).toBe('ок. 1600–1046 до н. э.');
});

it('считает длину правления', () => {
  expect(spanYears(dynastyById('qin')!)).toBe(14);
  expect(spanYears(dynastyById('zhou')!)).toBe(790);
});

it('границы ленты берутся из самих династий', () => {
  expect(TIMELINE_FROM).toBe(-2070);
  expect(TIMELINE_TO).toBe(1912);
});

it('у каждой династии есть три формы имени и источник', () => {
  const ids = new Set<string>();

  for (const dynasty of dynasties) {
    expect(ids.has(dynasty.id), `повтор ${dynasty.id}`).toBe(false);
    ids.add(dynasty.id);

    expect(dynasty.nameRu.trim().length, dynasty.id).toBeGreaterThan(0);
    expect(dynasty.nameZh.trim().length, dynasty.id).toBeGreaterThan(0);
    expect(dynasty.pinyin.trim().length, dynasty.id).toBeGreaterThan(0);
    expect(dynasty.note.trim().length, dynasty.id).toBeGreaterThan(0);
    expect(dynasty.sourceIds.length, dynasty.id).toBeGreaterThan(0);

    for (const sourceId of dynasty.sourceIds) {
      expect(sourceById(sourceId), `${dynasty.id}: нет источника ${sourceId}`)
        .toBeDefined();
    }
  }
});
