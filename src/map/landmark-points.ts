import { landmarks, type Landmark } from '../content/landmarks';
import { clusterPlaceables } from './cluster';
import { projectLonLat } from './projection';

/**
 * Каталог достопримечательностей в координатах карты.
 *
 * Отдельно от слоя по той же причине, что у городов: проекция — дело карты, а
 * не разметки, и считается один раз на весь каталог.
 */
export type LandmarkPoint = {
  readonly landmark: Landmark;
  readonly x: number;
  readonly y: number;
};

export const LANDMARK_POINTS: readonly LandmarkPoint[] = landmarks.map(
  (landmark) => {
    const [x, y] = projectLonLat(landmark.lon, landmark.lat);

    return { landmark, x, y };
  },
);

/*
 * Грозди целого вида: с них начинается любой раунд, и глубже они только
 * распадаются, поэтому соседство на целом виде — самое широкое.
 */
const WHOLE_VIEW_CLUSTERS = clusterPlaceables(
  LANDMARK_POINTS.map((point) => ({
    id: point.landmark.id,
    x: point.x,
    y: point.y,
  })),
).clusters;

/**
 * Соседи объекта по грозди целого вида — без него самого.
 *
 * Нужно «назвать достопримечательность»: гроздь — одна звезда, и если среди
 * четырёх вариантов окажутся два её члена, вопрос перестанет иметь один
 * верный ответ. Кого исключать из отвлекающих, знает карта — это её понятие
 * соседства, — а сам отбор вариантов остаётся в домене.
 */
export function colocatedLandmarkIds(landmarkId: string): readonly string[] {
  const cluster = WHOLE_VIEW_CLUSTERS.find((one) =>
    one.members.some((member) => member.id === landmarkId),
  );

  return (
    cluster?.members
      .map((member) => member.id)
      .filter((id) => id !== landmarkId) ?? []
  );
}
