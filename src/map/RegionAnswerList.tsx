import { useId, useState } from 'react';
import type { Region } from '../content/types';
import { TWO_COLUMN_QUERY } from '../design/breakpoints';
import type { RegionOutcome } from '../domain/fill-round';
import { searchRegions } from '../features/atlas/region-search';
import { OUTCOME_LABELS } from './outcome-labels';
import { regionsWord } from '../content/region-count';
import {
  isRegionClosed,
  isRegionSelectable,
  type AnswerState,
} from './region-selection';

/**
 * Начальное состояние блока. `window.matchMedia` в jsdom нет, и отсутствие
 * читается как «узкий экран»: на проверках список должен быть раскрыт, иначе
 * тесты ответа зависели бы от вёрстки.
 */
function defaultOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return !window.matchMedia(TWO_COLUMN_QUERY).matches;
}

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
  /**
   * `inline` — экран темы, `disclosure` — экран раунда, `panel` — атлас:
   * список с поиском и собственной прокруткой.
   */
  readonly presentation?: 'inline' | 'disclosure' | 'panel';
};

/**
 * Равнозначный способ ответа. WCAG 2.5.8 разрешает цели меньше 24×24, если то
 * же действие доступно управлением нужного размера на той же странице: при
 * 343 px 28 областей из 34 меньше порога, и список там — единственный рабочий
 * способ ответа.
 *
 * Свёрнут блок или раскрыт, для соответствия значения не имеет — исключение
 * требует, чтобы управление было на странице. Поэтому на широком экране он
 * закрыт (это снимает 34 остановки Tab из 72), а на узком раскрыт.
 */
export function RegionAnswerList({
  regions,
  selectedRegionId,
  onSelect,
  answerStates = NO_ANSWER_STATES,
  outcomes = NO_OUTCOMES,
  interactive = true,
  paused = false,
  presentation = 'inline',
}: RegionAnswerListProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const searchId = useId();
  const rules = { interactive, paused, answerStates, outcomes };

  /*
   * Фильтр применяется только в панели. В раунде список — равнозначный способ
   * ответа, и прятать из него варианты значило бы прятать часть ответов.
   */
  const shown = presentation === 'panel' ? searchRegions(regions, query) : regions;

  const list = (
    <ul className="map-alternative" aria-label="Список регионов карты">
      {shown.map((region) => {
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

  if (presentation === 'panel') {
    return (
      <div className="region-panel-list">
        <label className="region-panel-search" htmlFor={searchId}>
          Найти регион
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        {shown.length === 0 ? (
          <p className="status-note" role="status">
            Ничего не найдено. Попробуйте другое написание — например, пиньинь.
          </p>
        ) : (
          list
        )}
      </div>
    );
  }

  if (presentation === 'inline') {
    return list;
  }

  return (
    <details
      className="region-answer-list"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        Ответить из списка ({regions.length} {regionsWord(regions.length)})
      </summary>
      {list}
    </details>
  );
}
