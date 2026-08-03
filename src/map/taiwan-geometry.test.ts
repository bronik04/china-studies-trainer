import mapMarkup from '../../public/maps/china-provinces.svg?raw';
import { boundingBox, parseMapPath, type Point } from './svg-path';
import { projectLonLat } from './projection';

/**
 * Фактические крайние точки главного острова Тайвань: мыс Фугуй на севере
 * (25.30° с.ш.), мыс Элуаньби на юге (21.90° с.ш.), западное побережье около
 * 120.03° в.д. и мыс Сандяо на востоке (122.01° в.д.).
 */
const TAIWAN_EXTENT = {
  west: 120.03,
  east: 122.01,
  south: 21.9,
  north: 25.3,
} as const;

const TOLERANCE_PX = 3;

function mapPath(regionId: string): string {
  const match = new RegExp(`id="${regionId}"[^>]*?\\sd="([^"]+)"`, 's').exec(mapMarkup);
  if (!match) {
    throw new Error(`В карте нет контура региона: ${regionId}`);
  }

  return match[1];
}

it('рисует Тайвань подробным контуром, а не условной фигурой', () => {
  const rings = parseMapPath(mapPath('taiwan'));
  const points = rings.flat();

  expect(points.length).toBeGreaterThanOrEqual(200);
});

it('размещает Тайвань по его настоящим географическим границам', () => {
  const box = boundingBox(parseMapPath(mapPath('taiwan')));
  const [expectedMinX, expectedMinY] = projectLonLat(TAIWAN_EXTENT.west, TAIWAN_EXTENT.north);
  const [expectedMaxX, expectedMaxY] = projectLonLat(TAIWAN_EXTENT.east, TAIWAN_EXTENT.south);

  expect(Math.abs(box.minX - expectedMinX)).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(box.maxX - expectedMaxX)).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(box.minY - expectedMinY)).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(box.maxY - expectedMaxY)).toBeLessThanOrEqual(TOLERANCE_PX);
});

/**
 * Габариты Тайваня и Фуцзяни закономерно перекрываются: у Фуцзяни есть
 * острова восточнее западного берега Тайваня. Поэтому непересечение
 * проверяется по самим контурам, а не по прямоугольникам.
 */
function isInsideRing(point: Point, ring: readonly Point[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) {
      inside = !inside;
    }
  }

  return inside;
}

it('не накладывает Тайвань на материковые регионы', () => {
  const taiwan = parseMapPath(mapPath('taiwan')).flat();
  const neighbours = ['fujian', 'zhejiang', 'guangdong'].flatMap((id) =>
    parseMapPath(mapPath(id)),
  );

  const overlapping = taiwan.filter((point) =>
    neighbours.some((ring) => isInsideRing(point, ring)),
  );

  expect(overlapping).toHaveLength(0);
});
