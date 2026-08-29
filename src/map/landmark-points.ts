import { landmarks, type Landmark } from '../content/landmarks';
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

export function landmarkPointsOf(
  ids: readonly string[],
): readonly LandmarkPoint[] {
  const wanted = new Set(ids);

  return LANDMARK_POINTS.filter((point) => wanted.has(point.landmark.id));
}
