import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { regions } from '../../content/regions';
import { AtlasPage } from './AtlasPage';

function renderAtlas(selectedRegionId: string | null = null) {
  const onSelect = vi.fn();
  const onExit = vi.fn();
  const onTrain = vi.fn();

  const { container } = render(
    <AtlasPage
      regions={regions}
      selectedRegionId={selectedRegionId}
      onSelect={onSelect}
      onClear={() => {}}
      zoom={1}
      onZoomChange={() => {}}
      onExit={onExit}
      onTrain={onTrain}
    />,
  );

  return { container, onSelect, onExit, onTrain };
}

it('без выбора приглашает выбрать регион, а не отчитывается о пустоте', () => {
  renderAtlas();

  expect(
    screen.getByText(/Выберите регион на карте или найдите в списке/),
  ).toBeInTheDocument();
});

it('показывает карточку выбранного региона со всеми формами названия', () => {
  renderAtlas('hunan');

  const card = screen.getByTestId('atlas-region-card');

  expect(card).toHaveTextContent('Хунань');
  expect(card).toHaveTextContent('湖南');
  expect(card).toHaveTextContent('Чанша');
  expect(card).toHaveTextContent('长沙');
});

it('называет тип единицы словом, а не только цветом на карте', () => {
  renderAtlas('tibet');

  expect(screen.getByTestId('atlas-region-card')).toHaveTextContent(
    'Автономный район',
  );
});

it('выбор строки списка отдаётся наверх', () => {
  const { onSelect } = renderAtlas();

  /*
   * Запрос сужен до списка намеренно: контуры карты тоже несут `role="button"`
   * и то же имя, и без сужения тест не различал бы два способа выбора.
   */
  const list = within(screen.getByRole('list', { name: 'Список регионов карты' }));
  fireEvent.click(list.getByRole('button', { name: /^Хунань/ }));

  expect(onSelect).toHaveBeenCalledWith('hunan');
});

it('выбор области карты отдаётся наверх тем же обработчиком', () => {
  const { container, onSelect } = renderAtlas();

  fireEvent.click(container.querySelector('[data-region-id="hunan"]')!);

  expect(onSelect).toHaveBeenCalledWith('hunan');
});

it('даёт выход в кабинет и в тренировку', () => {
  const { onExit, onTrain } = renderAtlas();

  fireEvent.click(screen.getByRole('button', { name: /В кабинет/ }));
  fireEvent.click(screen.getByRole('button', { name: /Тренировать/ }));

  expect(onExit).toHaveBeenCalled();
  expect(onTrain).toHaveBeenCalled();
});
