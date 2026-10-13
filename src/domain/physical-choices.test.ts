import { describe, expect, it } from 'vitest';
import { physicalFeatures, physicalKindLabel } from '../content/physical-features';
import type { PhysicalFeature } from '../content/types';
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

  it('реку отвлекает линиями', () => {
    // Если к подсвеченной линии предложить «Гоби», ответ читается по форме
    // подсветки, а не по знанию: линия не может быть пустыней.
    for (const river of physicalFeatures.filter((f) => f.kind === 'river')) {
      const choices = buildPhysicalChoices(
        physicalFeatures,
        river.id,
        createSeededRandom(2),
      );

      expect(
        choices.every((choice) => ['river', 'gorge', 'canal'].includes(choice.kind)),
      ).toBe(true);
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

/*
 * Участок реки — тоже линия, и отвлекать его должны линии: иначе вопрос
 * решается видом подсветки, а не знанием. Своего рода у ущелий один-
 * единственный, поэтому без объединения в семью вариант остаётся один — он же
 * ответ.
 */
it('у участка реки четыре варианта, и все — линии', () => {
  const choices = buildPhysicalChoices(
    physicalFeatures,
    'three-gorges',
    createSeededRandom(1),
  );

  expect(choices).toHaveLength(4);
  for (const choice of choices) {
    expect(['river', 'gorge', 'canal']).toContain(choice.kind);
  }
});

/*
 * Часть и целое рядом в одном вопросе — подсказка наоборот: подсвечена вся
 * Янцзы, а среди имён стоит её же участок.
 */
it('часть и целое не встречаются в одном вопросе', () => {
  for (const [targetId, forbidden] of [
    ['yangtze', 'three-gorges'],
    ['three-gorges', 'yangtze'],
  ] as const) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const choices = buildPhysicalChoices(
        physicalFeatures,
        targetId,
        createSeededRandom(seed),
      );

      expect(choices.map((choice) => choice.id)).not.toContain(forbidden);
    }
  }
});

/*
 * Канал — линия, нарисованная тем же пером, что река, и отвлекать его должны
 * линии. Своего рода у него одна цель, и без семьи вариант остался бы один —
 * он же ответ. Тот же довод, что у ущелий.
 */
const testCanal: PhysicalFeature = {
  id: 'test-canal',
  kind: 'canal',
  nameRu: 'Проверочный канал',
  nameZh: '测试运河',
  pinyin: 'Cèshì Yùnhé',
  regionIds: ['jiangsu'],
  facts: [],
  sourceIds: [],
};

it('у канала четыре варианта, и все — линии', () => {
  const choices = buildPhysicalChoices(
    [...physicalFeatures, testCanal],
    'test-canal',
    createSeededRandom(1),
  );

  expect(choices).toHaveLength(4);
  for (const choice of choices) {
    expect(['river', 'gorge', 'canal']).toContain(choice.kind);
  }
});

it('род канала назван словом', () => {
  expect(physicalKindLabel(testCanal)).toBe('Канал');
});

it('у настоящего канала варианты — линии', () => {
  for (let seed = 1; seed <= 10; seed += 1) {
    const choices = buildPhysicalChoices(
      physicalFeatures,
      'grand-canal',
      createSeededRandom(seed),
    );

    expect(choices).toHaveLength(4);
    expect(choices.every((choice) => ['river', 'gorge', 'canal'].includes(choice.kind))).toBe(true);
  }
});
