import type { Region } from '../content/types';
import type { RegionOutcome } from '../domain/fill-round';
import { OUTCOME_LABELS } from './outcome-labels';
import {
  isRegionClosed,
  isRegionSelectable,
  type AnswerState,
} from './region-selection';

const NO_ANSWER_STATES: Readonly<Record<string, AnswerState>> = {};
const NO_OUTCOMES: Readonly<Record<string, RegionOutcome>> = {};

export type RegionAnswerListProps = {
  readonly regions: readonly Region[];
  readonly selectedRegionId: string | null;
  readonly onSelect: (regionId: string) => void;
  readonly answerStates?: Readonly<Record<string, AnswerState>>;
  readonly outcomes?: Readonly<Record<string, RegionOutcome>>;
  readonly interactive?: boolean;
  readonly paused?: boolean;
};

/**
 * Равнозначный способ ответа. WCAG 2.5.8 разрешает цели меньше 24×24, если то
 * же действие доступно управлением нужного размера на той же странице: при
 * 343 px 28 областей из 34 меньше порога, и список там — единственный рабочий
 * способ ответа.
 *
 * Список стоит в панели `RoundStage` («Ответить из списка»), которая
 * открывается и закрывается снаружи — здесь он всегда развёрнут. В атласе
 * такого списка нет: там выбирают на самой карте.
 */
export function RegionAnswerList({
  regions,
  selectedRegionId,
  onSelect,
  answerStates = NO_ANSWER_STATES,
  outcomes = NO_OUTCOMES,
  interactive = true,
  paused = false,
}: RegionAnswerListProps) {
  const rules = { interactive, paused, answerStates, outcomes };

  return (
    <ul className="map-alternative" aria-label="Список регионов карты">
      {regions.map((region) => {
        const outcome = outcomes[region.id];

        return (
          <li key={region.id}>
            <button
              type="button"
              aria-pressed={region.id === selectedRegionId}
              aria-disabled={paused ? true : undefined}
              data-outcome={outcome}
              disabled={isRegionClosed(rules, region.id)}
              onClick={() => {
                if (isRegionSelectable(rules, region.id)) {
                  onSelect(region.id);
                }
              }}
            >
              {region.nameRu} <span lang="zh-Hans">({region.nameZh})</span>
              {outcome ? ` — ${OUTCOME_LABELS[outcome]}` : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
