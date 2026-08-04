import { useEffect, useRef } from 'react';
import mapMarkup from '../../public/maps/china-provinces.svg?raw';
import type { Region } from '../content/types';
import type { RegionOutcome } from '../domain/fill-round';
import { MapControls, type MapZoom } from './MapControls';
import { MapDefs } from './MapDefs';

export type AnswerState = 'correct' | 'incorrect' | 'disabled';

export type MapHighlight = {
  readonly regionId: string;
  readonly kind: 'miss' | 'reveal';
};

type ChinaMapProps = {
  readonly regions: readonly Region[];
  readonly selectedRegionId: string | null;
  readonly onSelect: (regionId: string) => void;
  readonly onClear: () => void;
  readonly zoom?: MapZoom;
  readonly onZoomChange?: (zoom: MapZoom) => void;
  readonly answerStates?: Readonly<Record<string, AnswerState>>;
  /** Ложь — карта только показывает: области не выбираются и не получают фокус. */
  readonly interactive?: boolean;
  /**
   * `reference` — справочная карта: цвет означает тип региона.
   * `fill` — игровая: все регионы серые, цвет появляется только как исход.
   */
  readonly variant?: 'reference' | 'fill';
  readonly outcomes?: Readonly<Record<string, RegionOutcome>>;
  /**
   * Что показать поверх заливки. `miss` — вспышка на промахе, `reveal` —
   * показ региона, который так и не нашли. Виды разные, потому что живут
   * разное время и означают разное.
   */
  readonly highlight?: MapHighlight | null;
};

/**
 * Литерал `{}` прямо в параметрах создавал бы новый объект на каждый рендер,
 * и эффект перезапускался бы вхолостую: `answerStates` входит в его зависимости.
 */
const NO_ANSWER_STATES: Readonly<Record<string, AnswerState>> = {};
const NO_OUTCOMES: Readonly<Record<string, RegionOutcome>> = {};

/**
 * Нажатие принимает и сам контур, и увеличенная цель для мелких областей.
 * Цели помечены отдельным атрибутом: доступное имя, фокус и состояния должны
 * остаться на контуре, иначе регион удвоится в обходе по Tab и в дереве
 * доступности (см. scripts/generate-hit-targets.ts).
 */
function getRegionId(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const hit = target.closest<SVGElement>('[data-hit-region-id]');
  if (hit?.dataset.hitRegionId) {
    return hit.dataset.hitRegionId;
  }

  return target.closest<SVGElement>('[data-region-id]')?.dataset.regionId ?? null;
}

export function ChinaMap({
  regions,
  selectedRegionId,
  onSelect,
  onClear,
  zoom = 1,
  onZoomChange,
  answerStates = NO_ANSWER_STATES,
  interactive = true,
  variant = 'reference',
  outcomes = NO_OUTCOMES,
  highlight = null,
}: ChinaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const selectedRegion = regions.find((region) => region.id === selectedRegionId);

  useEffect(() => {
    const svg = mapRef.current?.querySelector<SVGElement>('svg');
    svg?.style.setProperty('transform', `scale(${zoom})`);
    const areas = mapRef.current?.querySelectorAll<SVGElement>('[data-region-id]');
    const labelsByMapAreaId = new Map(
      regions.map((region) => [
        region.mapAreaId,
        `${region.nameRu}, ${region.nameZh}`,
      ]),
    );

    areas?.forEach((area) => {
      area.dataset.selected = String(area.dataset.regionId === selectedRegionId);
      area.setAttribute('tabindex', interactive ? '0' : '-1');
      const label = labelsByMapAreaId.get(area.dataset.regionId ?? '');
      if (label) {
        area.setAttribute('aria-label', label);
      }

      const answerState = answerStates[area.dataset.regionId ?? ''];
      if (answerState) {
        area.dataset.answerState = answerState;
      } else {
        delete area.dataset.answerState;
      }

      if (answerState) {
        area.setAttribute('aria-disabled', 'true');
      } else {
        area.removeAttribute('aria-disabled');
      }

      const outcome = outcomes[area.dataset.regionId ?? ''];
      if (outcome) {
        area.dataset.outcome = outcome;
      } else {
        delete area.dataset.outcome;
      }

      if (highlight !== null && area.dataset.regionId === highlight.regionId) {
        area.dataset.highlight = highlight.kind;
      } else {
        delete area.dataset.highlight;
      }
    });
  }, [
    answerStates,
    highlight,
    interactive,
    outcomes,
    regions,
    selectedRegionId,
    zoom,
  ]);

  /**
   * Состояние ответа появляется у области только после ответа, а второй ответ
   * на вопрос запрещён (SPEC.md). Поэтому невыбираемы все области с любым
   * состоянием, включая верную и неверную: иначе они выглядели бы рабочими,
   * но не делали ничего.
   */
  function isSelectable(regionId: string): boolean {
    return interactive && answerStates[regionId] === undefined;
  }

  function selectTarget(target: EventTarget | null) {
    const regionId = getRegionId(target);
    if (regionId && isSelectable(regionId)) {
      onSelect(regionId);
    }
  }

  return (
    <section className="map-section" aria-labelledby="map-heading">
      <div className="section-heading">
        <h2 id="map-heading">{interactive ? 'Интерактивная карта' : 'Карта регионов'}</h2>
        {interactive ? <p>Выберите регион на схеме или в списке.</p> : null}
      </div>
      <p className="map-attribution">
        Геометрия 33 регионов: карта{' '}
        <a href="https://www.npmjs.com/package/@svg-maps/china">@svg-maps/china</a>{' '}
        (Victor Cazanave, на основе MapSVG) по лицензии{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.{' '}
        Контур Тайваня:{' '}
        <a href="https://github.com/antvis/china-geojson">china-geojson</a> (AntV).
      </p>
      {onZoomChange ? <MapControls zoom={zoom} onZoomChange={onZoomChange} /> : null}
      <MapDefs />
      <div
        className="china-map"
        data-map-variant={variant}
        ref={mapRef}
        onClick={(event) => selectTarget(event.target)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onClear();
            return;
          }

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectTarget(event.target);
          }
        }}
        dangerouslySetInnerHTML={{ __html: mapMarkup }}
      />
      {/*
        В упражнении «назови регион» карта только показывает. Назвать
        подсвеченную область или перечислить регионы здесь — значит выдать
        ответ, поэтому оба блока заменяются нейтральной подписью.
      */}
      {interactive ? (
        <p className="map-selection" role="status" aria-live="polite">
          {selectedRegion
            ? `Выбрано: ${selectedRegion.nameRu} (${selectedRegion.nameZh})`
            : 'Регион ещё не выбран.'}
        </p>
      ) : (
        <p className="map-selection">На карте подсвечена одна область.</p>
      )}
      {interactive ? (
        <ul className="map-alternative" aria-label="Список регионов карты">
          {regions.map((region) => (
            <li key={region.id}>
              <button
                type="button"
                aria-pressed={region.id === selectedRegionId}
                disabled={!isSelectable(region.id)}
                onClick={() => onSelect(region.id)}
              >
                {region.nameRu} <span lang="zh-Hans">({region.nameZh})</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
