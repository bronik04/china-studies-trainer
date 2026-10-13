import { expect, it } from 'vitest';
import {
  physicalFeatureById,
  physicalFeatures,
  physicalKindLabel,
} from './physical-features';

/*
 * Род читается формой знака, а не цветом, и словом в карточке: вершина и
 * впадина — обе `point`, но ученик ищет глазами именно вершину.
 */
it('вершина и впадина называются по-своему', () => {
  expect(physicalKindLabel(physicalFeatureById('everest')!)).toBe('Вершина');
  expect(physicalKindLabel(physicalFeatureById('turpan-depression')!)).toBe(
    'Впадина',
  );
});

it('море, залив и пролив называются по-своему', () => {
  expect(physicalKindLabel(physicalFeatureById('yellow-sea')!)).toBe('Море');
  expect(physicalKindLabel(physicalFeatureById('bohai')!)).toBe('Залив');
  expect(physicalKindLabel(physicalFeatureById('taiwan-strait')!)).toBe(
    'Пролив',
  );
});

it('хребет остаётся хребтом, а озеро озером', () => {
  expect(physicalKindLabel(physicalFeatureById('taihang')!)).toBe(
    'Горный хребет',
  );
  expect(physicalKindLabel(physicalFeatureById('chaohu')!)).toBe('Озеро');
});

/*
 * Ущелья — часть реки, и это сказано полем, а не подразумевается именем:
 * попадание в отрезок засчитывается вопросу о самой Янцзы, и правило должно
 * читаться из справочника, а не из карты.
 */
it('Три ущелья — часть Янцзы, и это сказано полем', () => {
  const gorges = physicalFeatureById('three-gorges');

  expect(gorges?.kind).toBe('gorge');
  expect(gorges?.kind === 'gorge' ? gorges.partOf : null).toBe('yangtze');
  expect(gorges?.regionIds).toEqual(['chongqing', 'hubei']);
  expect(gorges?.facts).toHaveLength(3);
});

it('род ущелья назван словом', () => {
  expect(physicalKindLabel(physicalFeatureById('three-gorges')!)).toBe('Ущелье');
});

it('целей физической карты стало сорок одна', () => {
  expect(physicalFeatures).toHaveLength(41);
});

it('Великий канал — линия-канал с тремя фактами и шестью регионами', () => {
  const canal = physicalFeatureById('grand-canal');

  expect(canal?.kind).toBe('canal');
  expect(canal?.nameZh).toBe('京杭大运河');
  expect(canal?.facts).toHaveLength(3);
  expect(canal?.regionIds).toEqual([
    'beijing',
    'tianjin',
    'hebei',
    'shandong',
    'jiangsu',
    'zhejiang',
  ]);
  expect(physicalKindLabel(canal!)).toBe('Канал');
});
