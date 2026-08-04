import type { Region, RegionKind } from '../../content/types';
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
  const selected = regions.find((region) => region.id === selectedRegionId);
  const ordered = [...regions].sort((left, right) =>
    left.nameRu.localeCompare(right.nameRu, 'ru'),
  );

  return (
    <main className="atlas-shell">
      <div className="atlas-layout">
        <div className="atlas-panel">
          <div className="atlas-region-card" data-testid="atlas-region-card">
            {selected ? (
              <>
                <h1>
                  {selected.nameRu} <span lang="zh-Hans">{selected.nameZh}</span>
                </h1>
                <p lang="zh-Latn-pinyin">{selected.pinyin}</p>
                <p className="status-note">{KIND_LABELS[selected.kind]}</p>
                <p>
                  Административный центр: {selected.capitalRu}{' '}
                  <span lang="zh-Hans">({selected.capitalZh})</span>
                </p>
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
            onSelect={onSelect}
          />
        </div>
        {/*
          `usage="answer"` намеренно: собственный заголовок карты, подсказка,
          строка выбора и вложенный список здесь только удвоили бы панель.
          О выбранном регионе рассказывает карточка слева.
        */}
        <div className="atlas-map">
          <ChinaMap
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelect={onSelect}
            onClear={onClear}
            zoom={zoom}
            onZoomChange={onZoomChange}
            usage="answer"
          />
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
