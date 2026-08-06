import { useState } from 'react';
import { cityById, citiesOfRegion } from '../../content/cities';
import { physicalFeatures } from '../../content/physical-features';
import type {
  PhysicalKind,
  Region,
  RegionKind,
  ReliefStep,
} from '../../content/types';
import { ChinaMap } from '../../map/ChinaMap';
import { MapAttribution } from '../../map/MapAttribution';
import type { MapZoom } from '../../map/MapControls';
import { RegionAnswerList } from '../../map/RegionAnswerList';

/**
 * Тип единицы назван словом. На справочной карте он же передан цветом, но
 * цвет — не единственный канал: соседи одного типа сливаются в общее поле, и
 * опознать тип по заливке нельзя (DESIGN_SYSTEM.md).
 */
const KIND_LABELS: Readonly<Record<RegionKind, string>> = {
  province: 'Провинция',
  'autonomous-region': 'Автономный район',
  municipality: 'Город центрального подчинения',
  sar: 'Специальный административный район',
};

/**
 * Ступени рельефа словами. Легенда обязательна: ступень — главное, что говорит
 * физическая карта, и цвет не может быть единственным её каналом. Высоты даны
 * как подсказка, а не как определение: ступени Китая — принятое членение, их
 * границы идут по формам рельефа, а не по горизонтали.
 */
const RELIEF_LEGEND: readonly {
  readonly step: ReliefStep;
  readonly title: string;
  readonly hint: string;
}[] = [
  { step: 1, title: 'Нагорье', hint: 'выше 4000 м' },
  { step: 2, title: 'Плато и котловины', hint: '1000–2000 м' },
  { step: 3, title: 'Равнины', hint: 'ниже 500 м' },
];

/** Род объекта назван словом — по той же причине, что и тип региона. */
const PHYSICAL_KIND_LABELS: Readonly<Record<PhysicalKind, string>> = {
  river: 'Река',
  landform: 'Форма рельефа',
};

const MAP_KINDS = [
  ['political', 'Политическая'],
  ['physical', 'Физическая'],
] as const;

type MapKind = (typeof MAP_KINDS)[number][0];

export type AtlasPageProps = {
  readonly regions: readonly Region[];
  readonly selectedRegionId: string | null;
  readonly onSelect: (regionId: string) => void;
  readonly onClear: () => void;
  readonly zoom: MapZoom;
  readonly onZoomChange: (zoom: MapZoom) => void;
  readonly onExit: () => void;
  readonly onTrain: () => void;
};

/**
 * Атлас: карта и справочник на одной поверхности. Заменяет прежнюю секцию
 * «Интерактивная карта» и сетку из 34 карточек, которая занимала 2317 px —
 * половину стартовой страницы.
 *
 * Сетка та же, что у раунда, и карта справа в обоих случаях: ученик ходит
 * между атласом и тренировкой, и карта не должна прыгать со стороны на сторону.
 */
export function AtlasPage({
  regions,
  selectedRegionId,
  onSelect,
  onClear,
  zoom,
  onZoomChange,
  onExit,
  onTrain,
}: AtlasPageProps) {
  /*
   * Вид карты живёт здесь, а не в `App`: он не меняет ни прогресса, ни раунда
   * и нужен одной этой поверхности.
   */
  const [mapKind, setMapKind] = useState<MapKind>('political');
  /*
   * Выбранный объект физической географии. Живёт рядом с видом карты и вместе
   * с ним сбрасывается: на политической карте рек нет, и оставленный выбор
   * пережил бы то, что его породило.
   */
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const selected = regions.find((region) => region.id === selectedRegionId);
  /*
   * Объект перебивает регион, пока показан физический вид: рассказывать
   * карточка может об одном, а выбрали последним объект — регион под ним
   * остался от прошлого вида.
   */
  const selectedFeature =
    mapKind === 'physical' && selectedFeatureId !== null
      ? physicalFeatures.find((feature) => feature.id === selectedFeatureId)
      : undefined;
  const ordered = [...regions].sort((left, right) =>
    left.nameRu.localeCompare(right.nameRu, 'ru'),
  );

  /*
   * Регион и объект — два ответа на один вопрос карточки, поэтому выбор
   * одного снимает другой. Регион держит `App`, объект — эта страница, и
   * согласовать их можно только здесь.
   */
  function selectRegion(regionId: string) {
    setSelectedFeatureId(null);
    onSelect(regionId);
  }

  function selectFeature(featureId: string) {
    setSelectedFeatureId(featureId);
    onClear();
  }

  return (
    <main className="atlas-shell">
      <div className="atlas-layout">
        <div className="atlas-panel">
          <div className="atlas-region-card" data-testid="atlas-region-card">
            {selectedFeature ? (
              <>
                <h1>
                  {selectedFeature.nameRu}{' '}
                  <span lang="zh-Hans">{selectedFeature.nameZh}</span>
                </h1>
                <p lang="zh-Latn-pinyin">{selectedFeature.pinyin}</p>
                <p className="status-note">
                  {PHYSICAL_KIND_LABELS[selectedFeature.kind]}
                </p>
                {/*
                  Регионы перечислены словами: по какой земле проходит река —
                  ровно то, ради чего её ищут на карте страноведения, а обвести
                  её по заливке глазом нельзя.
                */}
                <ul className="region-city-list">
                  {selectedFeature.regionIds.map((regionId) => (
                    <li key={regionId}>
                      {regions.find((region) => region.id === regionId)?.nameRu ??
                        regionId}
                    </li>
                  ))}
                </ul>
              </>
            ) : selected ? (
              <>
                <h1>
                  {selected.nameRu} <span lang="zh-Hans">{selected.nameZh}</span>
                </h1>
                <p lang="zh-Latn-pinyin">{selected.pinyin}</p>
                <p className="status-note">{KIND_LABELS[selected.kind]}</p>
                <p>
                  Административный центр: {cityById(selected.capitalCityId)?.nameRu}{' '}
                  <span lang="zh-Hans">
                    ({cityById(selected.capitalCityId)?.nameZh})
                  </span>
                </p>
                {/*
                  Города региона перечислены словами, а не только точками на
                  карте: точка — не текст, читалке экрана её не прочесть, а
                  делать полсотни знаков остановками Tab дороже, чем дать
                  список там, где регион и так разглядывают.
                */}
                <ul className="region-city-list">
                  {citiesOfRegion(selected.id).map((city) => (
                    <li key={city.id}>
                      {city.nameRu} <span lang="zh-Hans">{city.nameZh}</span>{' '}
                      <span lang="zh-Latn-pinyin">{city.pinyin}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h1>Атлас</h1>
                <p className="status-note">
                  Выберите регион на карте или найдите в списке.
                </p>
              </>
            )}
          </div>
          <RegionAnswerList
            presentation="panel"
            regions={ordered}
            selectedRegionId={selectedRegionId}
            onSelect={selectRegion}
          />
        </div>
        {/*
          `usage="answer"` намеренно: собственный заголовок карты, подсказка,
          строка выбора и вложенный список здесь только удвоили бы панель.
          О выбранном регионе рассказывает карточка слева.
        */}
        <div className="atlas-map">
          <fieldset className="atlas-map-kind">
            <legend>Вид карты</legend>
            {MAP_KINDS.map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="atlas-map-kind"
                  value={value}
                  checked={mapKind === value}
                  onChange={() => {
                    setMapKind(value);
                    setSelectedFeatureId(null);
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <ChinaMap
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelect={selectRegion}
            onClear={onClear}
            zoom={zoom}
            onZoomChange={onZoomChange}
            usage="answer"
            variant={mapKind === 'physical' ? 'physical' : 'reference'}
            /*
             * Города прячутся вместе с политическим видом не ради чистоты
             * картинки: слой ступеней рисуется после слоя городов и заливкой
             * закрыл бы их знаки — остались бы подписи без точек.
             */
            showsCities={mapKind === 'political'}
            selectedFeatureId={selectedFeatureId}
            onSelectFeature={selectFeature}
          />
          {/*
            Легенда стоит под картой и только у физического вида: на
            политической тип региона назван словом в карточке слева, а ступень
            рельефа назвать негде — форма не выбирается и карточки у неё нет.
          */}
          {mapKind === 'physical' ? (
            <ul className="relief-legend">
              {RELIEF_LEGEND.map((entry) => (
                <li key={entry.step}>
                  <span className="relief-swatch" data-step={entry.step} />
                  <span>{entry.title}</span>
                  <span className="status-note">{entry.hint}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <footer className="atlas-footer">
        <button type="button" className="secondary" onClick={onExit}>
          В кабинет
        </button>
        <button type="button" className="primary" onClick={onTrain}>
          Тренировать
        </button>
        <MapAttribution />
      </footer>
    </main>
  );
}
