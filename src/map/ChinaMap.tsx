import { useEffect, useRef } from 'react';
import mapMarkup from '../../public/maps/china-provinces.svg?raw';
import type { Region } from '../content/types';
import type { RegionOutcome } from '../domain/fill-round';
import { MapControls, type MapZoom } from './MapControls';
import { MapDefs } from './MapDefs';
import { OUTCOME_LABELS } from './outcome-labels';
import { isRegionSelectable, type AnswerState } from './region-selection';
import { RegionAnswerList } from './RegionAnswerList';

export type { AnswerState } from './region-selection';

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
  /**
   * `browse` — карта для разглядывания на экране темы: заголовок, подсказка,
   * строка выбора и список внутри секции. `answer` — карта как поверхность
   * ответа: ничего из этого, только карта.
   *
   * Отдельно от `variant` намеренно: `variant` — про цвет, `usage` — про
   * роль. Один параметр этих двух вопросов не выражает.
   */
  readonly usage?: 'browse' | 'answer';
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
  usage = 'browse',
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
     * Там, где на карте отвечают, подписи выносок скрываются: иначе карта
     * печатает «Макао» и «Гонконг» рядом с маркерами и выдаёт два ответа из
     * 34. Выносные линии остаются — они показывают, к каким территориям
     * относятся маркеры, не называя их.
     *
     * Условие по `usage`, а не по `variant`: утечка одинакова и в игре, и в
     * «найти на карте», где карта раскрашена по типу региона. Прежняя проверка
     * по `variant === 'fill'` закрывала только игру.
     *
     * Скрытие живёт здесь, а не в таблице стилей, намеренно: утечка ответа —
     * не оформление, и проверять её нужно там, где стили не подключены.
     */
    mapRef.current
      ?.querySelectorAll<SVGElement>('.map-callout text')
      .forEach((label) => {
        label.style.setProperty('display', usage === 'answer' ? 'none' : '');
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
    usage,
    zoom,
  ]);

  const selectionRules = { interactive, paused, answerStates, outcomes };

  function selectTarget(target: EventTarget | null) {
    const regionId = getRegionId(target);
    if (regionId !== null && isRegionSelectable(selectionRules, regionId)) {
      onSelect(regionId);
    }
  }

  const showsBrowseChrome = usage === 'browse';
  /*
   * Строка выбора нужна там, где выбор ещё не ответ. На экране раунда нажатие
   * и есть ответ, о нём объявляет карточка обратной связи, а второй aria-live
   * заставил бы читать результат дважды. В «назвать регион» карта не
   * интерактивна, и статичное объяснение подсветки остаётся.
   */
  const showsSelectionStatus =
    variant !== 'fill' && (showsBrowseChrome || !interactive);

  return (
    <section
      className="map-section"
      data-usage={usage}
      aria-labelledby={showsBrowseChrome ? 'map-heading' : undefined}
      aria-label={showsBrowseChrome ? undefined : 'Карта регионов'}
    >
      {showsBrowseChrome ? (
        <div className="section-heading">
          <h2 id="map-heading">
            {interactive ? 'Интерактивная карта' : 'Карта регионов'}
          </h2>
          {interactive ? <p>Выберите регион на схеме или в списке.</p> : null}
        </div>
      ) : null}
      <MapDefs />
      {/*
        Рамка держит карту и зум в одной системе координат: зум лежит на
        бумаге, в углу самой карты, а не отдельной полосой перед ней. Раньше
        три кнопки стояли до карты и весили больше неё.
      */}
      <div className="china-map-frame">
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
        {/* Зум идёт после карты в разметке: сначала предмет, потом управление им. */}
        {onZoomChange ? (
          <MapControls zoom={zoom} onZoomChange={onZoomChange} />
        ) : null}
      </div>
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
      {showsSelectionStatus ? (
        interactive ? (
          <p className="map-selection" role="status" aria-live="polite">
            {selectedRegion
              ? `Выбрано: ${selectedRegion.nameRu} (${selectedRegion.nameZh})`
              : 'Регион ещё не выбран.'}
          </p>
        ) : (
          <p className="map-selection">На карте подсвечена одна область.</p>
        )
      ) : null}
      {showsBrowseChrome && interactive ? (
        <RegionAnswerList
          regions={regions}
          selectedRegionId={selectedRegionId}
          onSelect={onSelect}
          answerStates={answerStates}
          outcomes={outcomes}
          paused={paused}
        />
      ) : null}
    </section>
  );
}
