import { describe, expect, it } from 'vitest';
import { physicalFeatures } from '../content/physical-features';
import { buildPhysicalChoices } from './physical-choices';
import { createSeededRandom } from './random';

describe('buildPhysicalChoices', () => {
  it('даёт четыре варианта, среди них правильный', () => {
    const choices = buildPhysicalChoices(
      physicalFeatures,
      'yangtze',
      createSeededRandom(1),
    );

    expect(choices).toHaveLength(4);
    expect(choices.map((choice) => choice.id)).toContain('yangtze');
  });

  it('реку отвлекает реками', () => {
    // Если к подсвеченной линии предложить «Гоби», ответ читается по форме
    // подсветки, а не по знанию: линия не может быть пустыней.
    for (const river of physicalFeatures.filter((f) => f.kind === 'river')) {
      const choices = buildPhysicalChoices(
        physicalFeatures,
        river.id,
        createSeededRandom(2),
      );

      expect(choices.every((choice) => choice.kind === 'river')).toBe(true);
    }
  });

  it('форму отвлекает формами', () => {
    for (const landform of physicalFeatures.filter((f) => f.kind === 'landform')) {
      const choices = buildPhysicalChoices(
        physicalFeatures,
        landform.id,
        createSeededRandom(3),
      );

      expect(choices.every((choice) => choice.kind === 'landform')).toBe(true);
    }
  });

  it('не повторяет вариант дважды', () => {
    const choices = buildPhysicalChoices(
      physicalFeatures,
      'gobi',
      createSeededRandom(4),
    );

    expect(new Set(choices.map((choice) => choice.id)).size).toBe(4);
  });

  it('одинаковый сид даёт одинаковый набор', () => {
    const first = buildPhysicalChoices(physicalFeatures, 'tarim', createSeededRandom(5));
    const second = buildPhysicalChoices(physicalFeatures, 'tarim', createSeededRandom(5));

    expect(first.map((c) => c.id)).toEqual(second.map((c) => c.id));
  });

  it('хребет отвлекают формами и хребтами: и то и другое — заливка', () => {
    // Правило смотрит на род, а хребет — форма рельефа. Разбиение выходит из
    // типов само: ответ не должен читаться по виду подсветки, а заливка от
    // заливки видом не отличается.
    const choices = buildPhysicalChoices(
      physicalFeatures,
      'qinling',
      createSeededRandom(11),
    );

    expect(choices).toHaveLength(4);
    expect(choices.every((choice) => choice.kind === 'landform')).toBe(true);
    expect(choices.map((choice) => choice.id)).toContain('qinling');
  });

  it('падает на неизвестной цели, а не молча даёт три варианта', () => {
    expect(() =>
      buildPhysicalChoices(physicalFeatures, 'not-a-feature', createSeededRandom(6)),
    ).toThrow(/not-a-feature/);
  });
});
