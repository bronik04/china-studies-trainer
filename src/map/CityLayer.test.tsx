import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../content/regions';
import { ChinaMap } from './ChinaMap';
import { cityPointsOfRegions } from './city-points';

const sichuan = regions.filter((region) => region.id === 'sichuan');

function renderMap(props: Partial<Parameters<typeof ChinaMap>[0]> = {}) {
  return render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      showsCities
      {...props}
    />,
  );
}

it('рисует города внутри самой карты, а не поверх неё вторым рисунком', () => {
  const { container } = renderMap();

  const layer = container.querySelector('.china-map svg .city-layer');

  expect(layer).not.toBeNull();
  expect(container.querySelectorAll('.china-map svg')).toHaveLength(1);
});

it('не показывает города, пока их не попросили', () => {
  const { container } = renderMap({ showsCities: false });

  expect(container.querySelector('.city-layer')).toBeNull();
});

it('ставит знак каждого города региона', () => {
  const { container } = renderMap({ regions: sichuan });

  expect(container.querySelectorAll('.city-mark')).toHaveLength(
    cityPointsOfRegions(['sichuan']).length,
  );
});

/*
 * Слой только показывает — 57 остановок Tab в атласе, где город ничего не
 * делает, стоили бы дороже, чем дают. Названия городов региона при этом
 * остаются доступны: их перечисляет его карточка.
 */
it('без обработчика не пускает города в обход клавиатурой', () => {
  const { container } = renderMap({ regions: sichuan });

  for (const hit of container.querySelectorAll('.city-hit')) {
    expect(hit.getAttribute('tabindex')).toBe('-1');
    expect(hit.getAttribute('aria-hidden')).toBe('true');
  }
});

it('с обработчиком отвечает на нажатие и называет город', () => {
  const select = vi.fn();
  renderMap({ regions: sichuan, onSelectCity: select });

  fireEvent.click(screen.getByRole('button', { name: 'Чэнду, 成都' }));

  expect(select).toHaveBeenCalledWith('chengdu');
});

it('отмечает выбранный город признаком, а не только цветом', () => {
  const { container } = renderMap({ regions: sichuan, selectedCityId: 'chengdu' });

  expect(
    container.querySelector('.city[data-city-id="chengdu"]')?.getAttribute('data-selected'),
  ).toBe('true');
});
