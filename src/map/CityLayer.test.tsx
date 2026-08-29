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

/*
 * Знак виден на той карте, где его разглядывают. В атласе карта шириной
 * 542 px при 806 единицах viewBox — 0.67 px на единицу, и знак радиусом 2.5
 * давал точку в 3.4 px.
 *
 * Цель нажатия от этого не меняется: она считается от `TARGET_DIAMETER_UNITS`
 * и к размеру знака не привязана.
 */
it('рисует знак города заметным на уменьшенной карте', () => {
  const { container } = renderMap();

  const mark = container.querySelector('.city-mark');

  expect(Number(mark?.getAttribute('r'))).toBeGreaterThanOrEqual(3.2);
});

/*
 * Дельта Янцзы — самая тесная часть каталога: между Шанхаем и Сучжоу пять
 * единиц карты при цели в семнадцать. Прежде цели разъезжались по кольцам и
 * связывались поводками; теперь города собираются в гроздь.
 */
it('собирает тесные города в гроздь вместо поводков', () => {
  const { container } = renderMap();

  expect(container.querySelector('.city-leader')).toBeNull();
  expect(container.querySelectorAll('.map-cluster').length).toBeGreaterThan(0);
});

it('раскрывает гроздь и отдаёт нажатие городу внутри', () => {
  const select = vi.fn();
  renderMap({ onSelectCity: select });

  fireEvent.click(screen.getByRole('button', { name: /Гроздь из 4 городов: Ханчжоу/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Шанхай, 上海' }));

  expect(select).toHaveBeenCalledWith('shanghai');
});

/*
 * В «назвать город» слой не отвечает на нажатие, и раскрыть гроздь руками
 * нельзя. Спрошенный город внутри неё обязан быть виден сам — иначе вопроса
 * на карте просто нет.
 */
it('раскрывает гроздь со спрошенным городом сама', () => {
  const { container } = renderMap({ selectedCityId: 'suzhou' });

  const open = container.querySelector('.map-cluster[data-open="true"]');

  expect(open).not.toBeNull();
  expect(open?.querySelector('.city[data-city-id="suzhou"]')).not.toBeNull();
});
