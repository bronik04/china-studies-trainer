import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { regions } from '../../content/regions';
import { AtlasPage } from './AtlasPage';

function renderAtlas(selectedRegionId: string | null = null) {
  const onSelect = vi.fn();
  const onTrain = vi.fn();

  const { container } = render(
    <AtlasPage
      regions={regions}
      selectedRegionId={selectedRegionId}
      onSelect={onSelect}
      onClear={() => {}}
      zoom={1}
      onZoomChange={() => {}}
      onTrain={onTrain}
    />,
  );

  return { container, onSelect, onTrain };
}

it('без выбора приглашает выбрать регион, а не отчитывается о пустоте', () => {
  renderAtlas();

  expect(
    screen.getByText(/Выберите регион на карте/),
  ).toBeInTheDocument();
});

/*
 * Пустая половина экрана рядом с картой читается как поломка, а не как
 * приглашение. Числа берутся из справочников — проверка держит и это.
 */
it('до выбора рассказывает, что лежит в каждом виде карты', () => {
  renderAtlas();

  expect(screen.getByText(/Справочник по карте/)).toBeInTheDocument();
  expect(screen.getByText(/34 региона провинциального уровня/)).toBeInTheDocument();
  expect(screen.getByText(/24 объекта: реки, формы рельефа и озёра/)).toBeInTheDocument();
});

it('убирает вводку, когда регион выбран', () => {
  renderAtlas('hunan');

  expect(screen.queryByText(/Справочник по карте/)).toBeNull();
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

/*
 * Список регионов из атласа убран: выбирают на карте, а карточка слева
 * рассказывает о выбранном. Тест сторожит именно отсутствие — вернувшийся
 * список снова занял бы половину колонки, ничего не добавив к карте, у
 * которой те же 34 области уже несут `role="button"` и свои имена.
 */
it('не дублирует карту списком регионов', () => {
  renderAtlas();

  expect(
    screen.queryByRole('list', { name: 'Список регионов карты' }),
  ).toBeNull();
  expect(screen.queryByLabelText('Найти регион')).toBeNull();
});

it('область карты доступна с клавиатуры и названа словом', () => {
  const { container } = renderAtlas();
  const area = container.querySelector('[data-region-id="hunan"]')!;

  expect(area).toHaveAttribute('role', 'button');
  expect(area).toHaveAttribute('tabindex', '0');
  expect(area.getAttribute('aria-label')).toMatch(/Хунань/);
});

it('выбор области карты отдаётся наверх тем же обработчиком', () => {
  const { container, onSelect } = renderAtlas();

  fireEvent.click(container.querySelector('[data-region-id="hunan"]')!);

  expect(onSelect).toHaveBeenCalledWith('hunan');
});

it('зовёт в тренировку и не повторяет шапку кнопкой выхода', () => {
  const { onTrain } = renderAtlas();

  fireEvent.click(screen.getByRole('button', { name: /Тренировать/ }));

  expect(onTrain).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /кабинет|главную/i })).toBeNull();
});

it('переключает карту между политической и физической', () => {
  const { container } = renderAtlas();

  expect(container.querySelector('.physical-layer')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('radio', { name: 'Физическая' }));

  expect(container.querySelector('.physical-layer')).toBeInTheDocument();
});

it('показывает шкалу высот под физической картой', () => {
  renderAtlas();

  fireEvent.click(screen.getByRole('radio', { name: 'Физическая' }));

  const scale = screen.getByRole('figure', { name: 'Высота, м над уровнем моря' });

  for (const tick of ['200', '500', '1000', '2000', '3000', '4000']) {
    expect(within(scale).getByText(tick)).toBeInTheDocument();
  }

  expect(within(scale).getByText('равнины')).toBeInTheDocument();
  expect(within(scale).getByText('нагорье')).toBeInTheDocument();
});

it('не показывает шкалу на политической карте', () => {
  renderAtlas();

  expect(
    screen.queryByRole('figure', { name: 'Высота, м над уровнем моря' }),
  ).toBeNull();
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
