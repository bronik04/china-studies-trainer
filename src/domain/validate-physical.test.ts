import { describe, expect, it } from 'vitest';
import { physicalFeatures } from '../content/physical-features';
import { regions } from '../content/regions';
import { sources } from '../content/sources';
import type { PhysicalFeature } from '../content/types';
import { ContentValidationError, validatePhysicalFeatures } from './validate-catalog';

const river: PhysicalFeature = {
  id: 'test-river',
  kind: 'river',
  nameRu: 'Тестовая',
  nameZh: '测试河',
  pinyin: 'Cèshì Hé',
  riverNums: [11],
  regionIds: ['qinghai'],
  facts: [],
  sourceIds: ['natural-earth-rivers-5.1.2'],
};

describe('validatePhysicalFeatures', () => {
  it('принимает настоящий справочник', () => {
    expect(() =>
      validatePhysicalFeatures(physicalFeatures, regions, sources, { expectedCount: 12 }),
    ).not.toThrow();
  });

  it('в справочнике шесть рек и шесть форм рельефа', () => {
    const rivers = physicalFeatures.filter((feature) => feature.kind === 'river');
    const landforms = physicalFeatures.filter((feature) => feature.kind === 'landform');

    expect(rivers).toHaveLength(6);
    expect(landforms).toHaveLength(6);
  });

  it('ловит повторяющийся id', () => {
    expect(() => validatePhysicalFeatures([river, river], regions, sources)).toThrow(
      ContentValidationError,
    );
  });

  it('ловит неизвестный регион', () => {
    expect(() =>
      validatePhysicalFeatures(
        [{ ...river, regionIds: ['atlantis'] }],
        regions,
        sources,
      ),
    ).toThrow(/atlantis/);
  });

  it('ловит отрезок, отданный двум рекам сразу', () => {
    expect(() =>
      validatePhysicalFeatures([river, { ...river, id: 'other-river' }], regions, sources),
    ).toThrow(/11/);
  });

  it('ловит реку без единого отрезка', () => {
    expect(() =>
      validatePhysicalFeatures([{ ...river, riverNums: [] }], regions, sources),
    ).toThrow(/отрезк/i);
  });

  it('ловит пустое китайское имя', () => {
    expect(() =>
      validatePhysicalFeatures([{ ...river, nameZh: '  ' }], regions, sources),
    ).toThrow(/nameZh/);
  });
});
