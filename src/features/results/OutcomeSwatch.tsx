import { FAILED_PATTERN_ID, SECOND_TRY_PATTERN_ID } from '../../map/MapDefs';

export type OutcomeSwatchProps = {
  /** Не задан — «не спрашивали»: та же бумага, что у несыгранного региона. */
  readonly outcome?: 'first-try' | 'second-try' | 'failed';
};

const FILLS = {
  'first-try': 'var(--map-first-try)',
  'second-try': `url(#${SECOND_TRY_PATTERN_ID})`,
  failed: `url(#${FAILED_PATTERN_ID})`,
} as const;

/**
 * Образец заливки для обозначений под картой итога. Узор берётся тот же, что
 * на самой карте, — из `MapDefs`, а не повторяется полосками CSS: исходы
 * различает именно узор, и образец с другим узором легенду не расшифровывал
 * бы (в оттенках серого и при дальтонизме). Узоры определены на странице
 * картой итога, рядом с которой обозначения и стоят.
 */
export function OutcomeSwatch({ outcome }: OutcomeSwatchProps) {
  return (
    <svg
      className="results-swatch"
      viewBox="0 0 14 14"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        width="14"
        height="14"
        fill={outcome === undefined ? 'var(--map-unplayed)' : FILLS[outcome]}
      />
    </svg>
  );
}
