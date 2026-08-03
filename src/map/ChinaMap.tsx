import { useEffect, useRef } from 'react';
import mapMarkup from '../../public/maps/china-provinces.svg?raw';
import type { Region } from '../content/types';
import { MapControls, type MapZoom } from './MapControls';

type ChinaMapProps = {
  readonly regions: readonly Region[];
  readonly selectedRegionId: string | null;
  readonly onSelect: (regionId: string) => void;
  readonly onClear: () => void;
  readonly zoom?: MapZoom;
  readonly onZoomChange?: (zoom: MapZoom) => void;
};

function getRegionId(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
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
      const label = labelsByMapAreaId.get(area.dataset.regionId ?? '');
      if (label) {
        area.setAttribute('aria-label', label);
      }
    });
  }, [regions, selectedRegionId, zoom]);

  function selectTarget(target: EventTarget | null) {
    const regionId = getRegionId(target);
    if (regionId) {
      onSelect(regionId);
    }
  }

  return (
    <section className="map-section" aria-labelledby="map-heading">
      <div className="section-heading">
        <h2 id="map-heading">Интерактивная карта</h2>
        <p>Выберите регион на схеме или в списке.</p>
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
      <div
        className="china-map"
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
      <p className="map-selection" role="status" aria-live="polite">
        {selectedRegion
          ? `Выбрано: ${selectedRegion.nameRu} (${selectedRegion.nameZh})`
          : 'Регион ещё не выбран.'}
      </p>
      <ul className="map-alternative" aria-label="Список регионов карты">
        {regions.map((region) => (
          <li key={region.id}>
            <button
              type="button"
              aria-pressed={region.id === selectedRegionId}
              onClick={() => onSelect(region.id)}
            >
              {region.nameRu} <span lang="zh-Hans">({region.nameZh})</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
