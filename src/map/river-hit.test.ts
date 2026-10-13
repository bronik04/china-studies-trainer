import { describe, expect, it } from 'vitest';
import { physicalFeatures } from '../content/physical-features';
import { nearestLine, RIVER_SHAPES, riverAt, type RiverShape } from './river-hit';

/** Точка на самой линии реки: берём её из настоящей геометрии. */
function pointOn(featureId: string) {
  const shape = RIVER_SHAPES.find((river) => river.featureId === featureId);
  const points = shape?.parts.flat() ?? [];

  return points[Math.floor(points.length / 2)];
}

describe('riverAt', () => {
  it('разбирает все линии карты — реки, участки рек и каналы', () => {
    expect(RIVER_SHAPES).toHaveLength(
      physicalFeatures.filter(
        (feature) =>
          feature.kind === 'river' || feature.kind === 'gorge' || feature.kind === 'canal',
      ).length,
    );
  });

  it('находит реку в точке на её линии', () => {
    for (const river of RIVER_SHAPES) {
      const [x, y] = pointOn(river.featureId);
      expect(riverAt(x, y, 8)).toBe(river.featureId);
    }
  });

  it('молчит там, где рек нет', () => {
    // Северо-западный угол рамки: суши там нет вовсе.
    expect(riverAt(-10, -10, 8)).toBeNull();
  });

  it('не отвечает рекой, до которой дальше порога', () => {
    const [x, y] = pointOn('tarim');
    expect(riverAt(x + 100, y, 8)).toBeNull();
  });

  it('на участке параллельных рек отдаёт точку ближайшей', () => {
    // Янцзы и Ланьцанцзян сходятся до 4 единиц: у точки на самой Янцзы
    // ответ обязан быть «Янцзы», а не «та, что нашлась первой».
    const [x, y] = pointOn('yangtze');
    expect(riverAt(x, y, 8)).toBe('yangtze');
  });
});

/*
 * Выбор ближайшей линии вынесен отдельной функцией со списком в доводе: до
 * этого ничью решал порядок записей в сгенерированном файле, а он ничего не
 * значит. Ущелья лежат на самой Янцзы, и оба ответа стоят к точке вплотную —
 * побеждать должен меньший объект, как у вложенных форм рельефа.
 */
describe('nearestLine', () => {
  const whole: RiverShape = {
    featureId: 'whole',
    parts: [
      [
        [0, 0],
        [40, 0],
      ],
    ],
  };
  /* Часть вырезана из целого и вдобавок округлена при записи пути. */
  const part: RiverShape = {
    featureId: 'part',
    parts: [
      [
        [10, 0.01],
        [20, 0.01],
      ],
    ],
  };
  const wholeOf = (id: string) => (id === 'part' ? 'whole' : undefined);

  it('часть побеждает целое, хотя целое ближе, — и в любом порядке списка', () => {
    expect(nearestLine([whole, part], 15, 0, 1, wholeOf)).toBe('part');
    expect(nearestLine([part, whole], 15, 0, 1, wholeOf)).toBe('part');
  });

  it('за концом части отвечает целое, хотя лента цели часть ещё достаёт', () => {
    /*
     * Двадцать с половиной — сразу за концом части, и лента цели её достаёт.
     * Но река там ближе на полединицы, а не на сотые, — значит рука метила в
     * реку. Иначе участок забирал бы себе ещё столько же реки за своим концом.
     */
    expect(nearestLine([whole, part], 20.5, 0, 10, wholeOf)).toBe('whole');
    expect(nearestLine([whole, part], 19.5, 0, 10, wholeOf)).toBe('part');
  });

  it('дальше порога не отвечает никто', () => {
    expect(nearestLine([whole, part], 15, 5, 1, wholeOf)).toBeNull();
  });
});
