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
      validatePhysicalFeatures(physicalFeatures, regions, sources, { expectedCount: 41 }),
    ).not.toThrow();
  });

  it('в справочнике шесть рек, двадцать форм, шесть озёр, две точки и пять морских целей', () => {
    const rivers = physicalFeatures.filter((feature) => feature.kind === 'river');
    const landforms = physicalFeatures.filter(
      (feature) => feature.kind === 'landform',
    );
    const ranges = landforms.filter(
      (feature) => feature.kind === 'landform' && feature.landform === 'range',
    );

    const lakes = physicalFeatures.filter((feature) => feature.kind === 'lake');
    const points = physicalFeatures.filter((feature) => feature.kind === 'point');
    const marine = physicalFeatures.filter(
      (feature) => feature.kind === 'marine',
    );

    expect(rivers).toHaveLength(6);
    expect(landforms).toHaveLength(20);
    expect(ranges).toHaveLength(7);
    expect(lakes).toHaveLength(6);
    expect(points).toHaveLength(2);
    expect(marine).toHaveLength(5);
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

  it('ловит повторяющуюся тему факта', () => {
    const fact = {
      title: 'Исток',
      body: 'Начинается в горах Куньлунь.',
      sourceIds: ['natural-earth-rivers-5.1.2'],
    };
    expect(() =>
      validatePhysicalFeatures(
        [{ ...river, facts: [fact, { ...fact, body: 'Течёт на восток.' }] }],
        regions,
        sources,
      ),
    ).toThrow(/повторяющаяся тема факта «Исток»/i);
  });

  it('ловит пустое китайское имя', () => {
    expect(() =>
      validatePhysicalFeatures([{ ...river, nameZh: '  ' }], regions, sources),
    ).toThrow(/nameZh/);
  });
});
