import { fireEvent, render, screen, within } from '@testing-library/react';
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

/*
 * Раздел вырос с двенадцати карточек до шестидесяти пяти. Без перехода к
 * группе «по регионам» находится посреди шести тысяч пикселей прокрутки.
 */
it('даёт перейти к каждой группе', () => {
  renderPage();

  const jump = screen.getByRole('navigation', { name: 'Группы коллекций' });

  for (const group of COLLECTION_GROUPS) {
    const link = within(jump).getByRole('link', {
      name: new RegExp(`^${group.title}`),
    });

    expect(link).toHaveAttribute('href', `#group-${group.id}`);
    expect(document.getElementById(`group-${group.id}`)).not.toBeNull();
  }
});

/*
 * Карточка либо показывает снимок, либо не показывает ничего. Место под
 * снимок с надписью «снимок ещё не подобран» осталось только там, где съёмка
 * описана, а файла нет; сейчас таких нет ни одной, и проверка сторожит
 * именно это — карточка не обещает того, чего нет.
 */
it('не обещает снимков, которых нет', () => {
  renderPage();

  const cards = document.querySelectorAll('.collection-card');
  const images = document.querySelectorAll('.collection-card img');

  expect(cards.length).toBe(collections.length);
  expect(images.length).toBe(
    collections.filter((collection) => collection.photos.length > 0).length,
  );
  expect(document.querySelectorAll('.collection-card .photo-slot')).toHaveLength(0);
});
