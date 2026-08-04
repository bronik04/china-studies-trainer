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

/**
 * Исход обязан быть доступен не только цветом: с программой чтения с экрана
 * ученик иначе не отличит закрашенный регион от ещё не спрошенного
 * (AGENTS.md: карта должна иметь текстовые альтернативы и не полагаться
 * только на цвет).
 */
const OUTCOME_LABELS: Readonly<Record<RegionOutcome, string>> = {
  'first-try': 'взят с первой попытки',
  'second-try': 'взят со второй попытки',
  failed: 'не угадан',
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
  /**
   * Истина — карта временно не принимает ответ (идёт показ региона). Область
   * и список при этом остаются на месте: снимать их значило бы отправить
   * фокус клавиатуры на body и заставить проходить табом заново.
   */
  readonly paused?: boolean;
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
  paused = false,
}: ChinaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const selectedRegion = regions.find((region) => region.id === selectedRegionId);

  useEffect(() => {
    const svg = mapRef.current?.querySelector<SVGElement>('svg');
    svg?.style.setProperty('transform', `scale(${zoom})`);

    /*
     * В игре подписи выносок скрываются: иначе карта печатает «Макао» и
     * «Гонконг» рядом с маркерами и выдаёт два ответа из 34. Выносные линии
     * остаются — они показывают, к каким территориям относятся маркеры, не
     * называя их.
     *
     * Скрытие живёт здесь, а не в таблице стилей, намеренно: утечка ответа —
     * не оформление, и проверять её нужно там, где стили не подключены.
     */
    mapRef.current
      ?.querySelectorAll<SVGElement>('.map-callout text')
      .forEach((label) => {
        label.style.setProperty('display', variant === 'fill' ? 'none' : '');
      });

    const areas = mapRef.current?.querySelectorAll<SVGElement>('[data-region-id]');
    const labelsByMapAreaId = new Map(
      regions.map((region) => [
        region.mapAreaId,
        `${region.nameRu}, ${region.nameZh}`,
      ]),
    );

    areas?.forEach((area) => {
      const regionId = area.dataset.regionId ?? '';
      area.dataset.selected = String(regionId === selectedRegionId);
      area.setAttribute('tabindex', interactive ? '0' : '-1');

      const answerState = answerStates[regionId];
      if (answerState) {
        area.dataset.answerState = answerState;
      } else {
        delete area.dataset.answerState;
      }

      const outcome = outcomes[regionId];
      if (outcome) {
        area.dataset.outcome = outcome;
      } else {
        delete area.dataset.outcome;
      }

      const label = labelsByMapAreaId.get(regionId);
      if (label) {
        area.setAttribute(
          'aria-label',
          outcome ? `${label} — ${OUTCOME_LABELS[outcome]}` : label,
        );
      }

      if (answerState || outcome || paused) {
        area.setAttribute('aria-disabled', 'true');
      } else {
        area.removeAttribute('aria-disabled');
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
    paused,
    regions,
    selectedRegionId,
    variant,
    zoom,
  ]);

  /**
   * Состояние ответа появляется у области только после ответа, а второй ответ
   * на вопрос запрещён (SPEC.md). Поэтому невыбираемы все области с любым
   * состоянием, включая верную и неверную: иначе они выглядели бы рабочими,
   * но не делали ничего.
   *
   * По той же причине невыбираем и уже закрашенный регион: он своё отыграл,
   * и повторное нажатие не должно стоить попытки на текущем вопросе.
   */
  function isSelectable(regionId: string): boolean {
    return (
      interactive &&
      !paused &&
      answerStates[regionId] === undefined &&
      outcomes[regionId] === undefined
    );
  }

  /**
   * Кнопка списка выключается только по окончательным причинам. Пауза — не
   * из них: `disabled` на кнопке, где стоит фокус, сбрасывает его в браузере.
   */
  function isClosed(regionId: string): boolean {
    return (
      answerStates[regionId] !== undefined || outcomes[regionId] !== undefined
    );
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
      {/*
        В игровом режиме карта о выборе не рассказывает: результат хода
        объявляет экран раунда. Второй `aria-live` на экране означал бы, что
        после каждого ответа программа чтения читает ещё и «Регион ещё не
        выбран» — выбор там всегда пуст.
      */}
      {variant === 'fill' ? null : interactive ? (
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
          {regions.map((region) => {
            const outcome = outcomes[region.id];

            return (
              <li key={region.id}>
                <button
                  type="button"
                  aria-pressed={region.id === selectedRegionId}
                  aria-disabled={paused ? true : undefined}
                  data-outcome={outcome}
                  disabled={isClosed(region.id)}
                  onClick={() => {
                    if (isSelectable(region.id)) {
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
      ) : null}
    </section>
  );
}
