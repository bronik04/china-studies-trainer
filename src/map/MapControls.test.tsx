import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../content/regions';
import { ChinaMap } from './ChinaMap';
import { MapControls } from './MapControls';

it('requests the next zoom level from the initial view', () => {
  const change = vi.fn();
  render(<MapControls zoom={1} onZoomChange={change} />);

  fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }));

  expect(change).toHaveBeenCalledWith(1.25);
});

it('disables controls that would not change the initial view', () => {
  render(<MapControls zoom={1} onZoomChange={() => {}} />);

  expect(screen.getByRole('button', { name: 'Уменьшить' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Сбросить вид' })).toBeDisabled();
});

it('resets a magnified map to its initial view', () => {
  const change = vi.fn();
  render(<MapControls zoom={1.5} onZoomChange={change} />);

  fireEvent.click(screen.getByRole('button', { name: 'Сбросить вид' }));

  expect(change).toHaveBeenCalledWith(1);
});

it('стоит внутри коробки карты, а не до неё', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      zoom={1}
      onZoomChange={() => {}}
    />,
  );

  const controls = screen.getByLabelText('Масштаб карты');

  expect(controls.closest('.china-map-frame')).not.toBeNull();
});

/*
 * Управление достаётся тому, кто его попросил. Прежде проверка держала ещё и
 * `interactive`: витрина в герое главной получала `onZoomChange` и вместе с ним
 * три кнопки по 44 px. Колбэк оттуда убран, а условие по `interactive` мешало
 * играм по городам — там карту не выбирают областями, но увеличивать и двигать
 * её нужно как раз там.
 */
it('не показывает зум карте, которая о нём не просила', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      interactive={false}
      zoom={1}
    />,
  );

  expect(screen.queryByLabelText('Масштаб карты')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Увеличить' })).toBeNull();
});

it('показывает зум карте, которой отвечают точками, а не областями', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      interactive={false}
      zoom={1}
      onZoomChange={() => {}}
    />,
  );

  expect(screen.getByRole('button', { name: 'Увеличить' })).toBeInTheDocument();
});
