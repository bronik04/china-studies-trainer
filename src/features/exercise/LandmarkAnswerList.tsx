import type { Landmark } from '../../content/landmarks';
import {
  labelOf,
  langOf,
  type QuestionLanguage,
} from '../../domain/question-language';

export type LandmarkAnswerListProps = {
  readonly landmarks: readonly Landmark[];
  readonly language: QuestionLanguage;
  readonly targetId: string;
  readonly answeredId: string | null;
  readonly disabled: boolean;
  readonly onSelect: (landmarkId: string) => void;
};

/**
 * Равнозначный список достопримечательностей — второй способ ответить в
 * «Найти достопримечательность».
 *
 * Нужен по той же причине, что списки регионов и городов: ответить с
 * клавиатуры и через читалку экрана нужно всегда. Разметка и стили общие с
 * ними — `.map-alternative`.
 */
export function LandmarkAnswerList({
  landmarks,
  language,
  targetId,
  answeredId,
  disabled,
  onSelect,
}: LandmarkAnswerListProps) {
  const ordered = [...landmarks].sort((left, right) =>
    left.nameRu.localeCompare(right.nameRu, 'ru'),
  );

  return (
    <ul className="map-alternative" aria-label="Список достопримечательностей">
      {ordered.map((landmark) => (
        <li key={landmark.id}>
          <button
            type="button"
            data-landmark-id={landmark.id}
            data-result={
              answeredId === null
                ? undefined
                : landmark.id === targetId
                  ? 'correct'
                  : landmark.id === answeredId
                    ? 'incorrect'
                    : undefined
            }
            aria-disabled={disabled ? 'true' : undefined}
            onClick={() => {
              if (!disabled) {
                onSelect(landmark.id);
              }
            }}
          >
            <span lang={langOf(language)}>{labelOf(landmark, language)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
