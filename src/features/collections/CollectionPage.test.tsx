import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { collectionById, type Collection } from '../../content/collections';
import { regions } from '../../content/regions';
import { CollectionPage } from './CollectionPage';

function byId(id: string): Collection {
  const collection = collectionById(id);
  if (collection === undefined) {
    throw new Error(`Нет коллекции ${id}`);
  }

  return collection;
}

function renderPage(id: string) {
  const handlers = {
    onOpenCollections: vi.fn(),
    onOpenCollection: vi.fn(),
    onTrainRegions: vi.fn(),
  };

  render(
    <CollectionPage
      collection={byId(id)}
      regions={regions}
      {...handlers}
    />,
  );

  return handlers;
}

it('называет коллекцию по-русски, иероглифами и пиньинем', () => {
  const { container } = render(
    <CollectionPage
      collection={byId('great-wall')}
      regions={regions}
      onOpenCollections={vi.fn()}
      onOpenCollection={vi.fn()}
      onTrainRegions={vi.fn()}
    />,
  );

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Великая стена',
  );
  expect(container.querySelector('[lang="zh-Hans"]')).toHaveTextContent('长城');
  expect(container.querySelector('[lang="zh-Latn-pinyin"]')).toHaveTextContent(
    'Chángchéng',
  );
});

it('перечисляет регионы коллекции списком, а не только заливкой на карте', () => {
  renderPage('great-wall');

  const list = document.querySelector('.member-list');

  expect(list).not.toBeNull();
  expect(list?.querySelectorAll('li')).toHaveLength(9);
  expect(list).toHaveTextContent('Ляонин');
});

it('легенда карты коллекции называет оба состояния словами', () => {
  renderPage('great-wall');

  expect(screen.getByText(/входит в коллекцию/)).toBeInTheDocument();
  expect(screen.getByText(/остальные/)).toBeInTheDocument();
});

it('«спросить эти регионы» запускает раунд ровно по ним', () => {
  const { onTrainRegions } = renderPage('great-wall');

  fireEvent.click(screen.getByRole('button', { name: 'Спросить эти регионы' }));

  expect(onTrainRegions).toHaveBeenCalledWith(byId('great-wall').regionIds);
});

it('черновик признаётся черновиком, пока у него нет источника', () => {
  renderPage('great-wall');

  expect(screen.getByTestId('draft-note')).toHaveTextContent(
    'содержание этой коллекции ещё не проверено по источникам',
  );
});

it('ненаписанная справка названа ненаписанной, а раздел не исчезает', () => {
  renderPage('yunnan');

  expect(
    screen.getByRole('heading', { level: 2, name: 'Что стоит знать' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Справка ещё не написана/)).toBeInTheDocument();
});

it('отсутствие снимков объявлено, а не спрятано', () => {
  renderPage('yunnan');

  expect(
    screen.getByText(/Пока их нет, коллекция работает как список регионов/),
  ).toBeInTheDocument();
  expect(screen.getByText('снимков пока нет')).toBeInTheDocument();
});

it('коллекция без привязки к регионам не показывает карту и кнопку раунда', () => {
  renderPage('spring-festival');

  expect(
    screen.queryByRole('button', { name: 'Спросить эти регионы' }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Вся страна/)).toBeInTheDocument();
});

it('хлебные крошки возвращают в раздел', () => {
  const { onOpenCollections } = renderPage('great-wall');

  fireEvent.click(screen.getByRole('button', { name: 'Коллекции' }));

  expect(onOpenCollections).toHaveBeenCalled();
});

it('«смотрите также» ведёт в соседнюю коллекцию', () => {
  const { onOpenCollection } = renderPage('great-wall');

  fireEvent.click(screen.getByRole('button', { name: /Шёлковый путь/ }));

  expect(onOpenCollection).toHaveBeenCalledWith('silk-road');
});
