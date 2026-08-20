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

it('переключает карту между политической и физической', () => {
  const { container } = renderAtlas();

  expect(container.querySelector('.physical-layer')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('radio', { name: 'Физическая' }));

  expect(container.querySelector('.physical-layer')).toBeInTheDocument();
  expect(screen.getByText('Нагорье')).toBeInTheDocument();
  expect(screen.getByText('Плато и котловины')).toBeInTheDocument();
  expect(screen.getByText('Равнины')).toBeInTheDocument();
});

it('в физическом виде выбранная река открывает свою карточку', () => {
  renderAtlas();

  fireEvent.click(screen.getByRole('radio', { name: 'Физическая' }));
  fireEvent.keyDown(screen.getByLabelText(/Хуанхэ/), { key: 'Enter' });

  const card = screen.getByTestId('atlas-region-card');

  expect(card).toHaveTextContent('Хуанхэ');
  expect(card).toHaveTextContent('黄河');
  expect(card).toHaveTextContent('Река');
});

it('возврат к политической карте сбрасывает выбранный объект', () => {
  renderAtlas('hunan');

  fireEvent.click(screen.getByRole('radio', { name: 'Физическая' }));
  fireEvent.keyDown(screen.getByLabelText(/Хуанхэ/), { key: 'Enter' });
  fireEvent.click(screen.getByRole('radio', { name: 'Политическая' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Физическая' }));

  // Река осталась бы выбранной, если бы переключение вида её не снимало.
  expect(screen.getByTestId('atlas-region-card')).toHaveTextContent('Хунань');
});

it('карточка региона показывает справку с темами и строкой источников', () => {
  renderAtlas('sichuan');

  const card = screen.getByTestId('atlas-region-card');

  expect(card).toHaveTextContent('Справка');
  expect(card).toHaveTextContent('Убежище большой панды');
  expect(card).toHaveTextContent(/Источники: /);
  expect(card).toHaveTextContent('Britannica');
  expect(card).toHaveTextContent('ЮНЕСКО');
  // В строке — короткие имена; полное имя организации не печатается.
  expect(card).not.toHaveTextContent('Encyclopaedia Britannica');
});

/*
 * У физических объектов facts пока пусты (контентные ветки наполняли регионы
 * и коллекции) — блок обязан молча не рендериться, а не показывать пустую
 * «Справку». Когда факты объектов наполнят, компонент заработает без правок,
 * и этот тест нужно будет заменить позитивным.
 */
it('пустая справка физического объекта не рендерится', () => {
  renderAtlas();

  fireEvent.click(screen.getByRole('radio', { name: 'Физическая' }));
  fireEvent.keyDown(screen.getByLabelText(/Хуанхэ/), { key: 'Enter' });

  const card = screen.getByTestId('atlas-region-card');

  expect(card).toHaveTextContent('Хуанхэ');
  expect(card).not.toHaveTextContent('Справка');
});
