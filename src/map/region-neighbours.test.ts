import { REGION_NEIGHBOURS } from './region-neighbours';
import { regions } from '../content/regions';

const ids = regions.map((region) => region.id);

it('знает всех 34 региона и только их', () => {
  expect(Object.keys(REGION_NEIGHBOURS).sort()).toEqual([...ids].sort());
});

it('симметричен: сосед соседа — я сам', () => {
  for (const [id, list] of Object.entries(REGION_NEIGHBOURS)) {
    for (const other of list) {
      expect(REGION_NEIGHBOURS[other]).toContain(id);
    }
  }
});

it('держит 70 рёбер', () => {
  const degrees = Object.values(REGION_NEIGHBOURS).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  expect(degrees / 2).toBe(70);
});

it('у островов соседей нет, у САР — один Гуандун', () => {
  expect(REGION_NEIGHBOURS.hainan).toEqual([]);
  expect(REGION_NEIGHBOURS.taiwan).toEqual([]);
  expect(REGION_NEIGHBOURS['hong-kong']).toEqual(['guangdong']);
  expect(REGION_NEIGHBOURS.macao).toEqual(['guangdong']);
});

it('называет соседей Сычуани и Внутренней Монголии', () => {
  expect([...REGION_NEIGHBOURS.sichuan].sort()).toEqual([
    'chongqing',
    'gansu',
    'guizhou',
    'qinghai',
    'shaanxi',
    'tibet',
    'yunnan',
  ]);
  expect(REGION_NEIGHBOURS['inner-mongolia']).toHaveLength(8);
});
