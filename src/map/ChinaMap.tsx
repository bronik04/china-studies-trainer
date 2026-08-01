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
    areas?.forEach((area) => {
      area.dataset.selected = String(area.dataset.regionId === selectedRegionId);
    });
  }, [selectedRegionId, zoom]);

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
        Адаптировано из карты{' '}
        <a href="https://commons.wikimedia.org/wiki/File:China_province-level_divisions.svg">
          SilverStar54
        </a>{' '}
        по лицензии{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.
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
