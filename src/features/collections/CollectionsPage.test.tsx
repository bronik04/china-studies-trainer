import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { COLLECTION_GROUPS, collections } from '../../content/collections';
import { regions } from '../../content/regions';
import { CollectionsPage } from './CollectionsPage';

function renderPage() {
  const onOpenCollection = vi.fn();
  render(
    <CollectionsPage regions={regions} onOpenCollection={onOpenCollection} />,
  );

  return { onOpenCollection };
}

it('раскладывает коллекции по трём группам', () => {
  renderPage();

  for (const group of COLLECTION_GROUPS) {
    expect(
      screen.getByRole('heading', { level: 2, name: group.title }),
    ).toBeInTheDocument();
  }
});

it('показывает все коллекции сразу: фильтра здесь нет', () => {
  renderPage();

  const cards = screen
    .getAllByRole('listitem')
    .filter((item) => item.classList.contains('collection-card'));

  expect(cards).toHaveLength(collections.length);
});

it('карточка ведёт на страницу своей коллекции', () => {
  const { onOpenCollection } = renderPage();

  fireEvent.click(screen.getByRole('button', { name: /Великая стена/ }));

  expect(onOpenCollection).toHaveBeenCalledWith('great-wall');
});

it('подвал говорит о правиле, а не утверждает, что источники уже есть', () => {
  renderPage();

  expect(
    screen.getByText(/Коллекция считается готовой, когда у неё есть проверенный источник/),
  ).toBeInTheDocument();
});
