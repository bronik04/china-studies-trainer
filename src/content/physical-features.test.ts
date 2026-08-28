import { expect, it } from 'vitest';
import { physicalFeatureById, physicalKindLabel } from './physical-features';

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
