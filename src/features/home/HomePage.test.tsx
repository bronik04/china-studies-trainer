import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { collections } from '../../content/collections';
import { regions } from '../../content/regions';
import type { Attempt } from '../../domain/round';
import { HomePage } from './HomePage';

/**
 * История нужна только тем проверкам, где от неё зависит подпись главного
 * шага: карточки игр от неё не зависят — все открыты сразу.
 */
function renderHome(attempts: readonly Attempt[] = []) {
  const handlers = {
    onStartRound: vi.fn(),
    onStartFillRound: vi.fn(),
    onOpenAtlas: vi.fn(),
    onOpenCollections: vi.fn(),
    onOpenCollection: vi.fn(),
  };

  render(<HomePage regions={regions} attempts={attempts} {...handlers} />);

  return handlers;
}

it('на экране ровно одна главная кнопка', () => {
  renderHome();

  const primary = screen
    .getAllByRole('button')
    .filter((button) => button.classList.contains('primary'));

  expect(primary).toHaveLength(1);
});

it('главная кнопка называет следующий шаг и запускает его', () => {
  const { onStartRound } = renderHome();

  fireEvent.click(screen.getByRole('button', { name: 'Начать: найти на карте' }));

  expect(onStartRound).toHaveBeenCalledWith('find-on-map', 1, null);
});

it('карточка открытого режима запускает свой раунд', () => {
  const { onStartRound } = renderHome();

  fireEvent.click(screen.getByRole('button', { name: /Назвать регион/ }));

  expect(onStartRound).toHaveBeenCalledWith('name-region', 1, null);
});

/*
 * Игры равноправны и открыты все сразу: это разные занятия, а не ступени одной
 * лестницы. Заслуживать доступ не нужно и истории для этого не требуется.
 */
it('карточка игры запускается без всякой истории', () => {
  const { onStartRound } = renderHome();

  const card = screen.getByRole('button', { name: /Регион — столица/ });

  expect(card).toBeEnabled();
  fireEvent.click(card);

  expect(onStartRound).toHaveBeenCalledWith('match-capital', 2, null);
});

it('карточка ненаписанного режима не запускается и говорит почему', () => {
  const { onStartRound } = renderHome();

  const card = screen.getByRole('button', {
    name: /История: династии и даты/,
  });

  expect(card).toBeDisabled();
  expect(card).toHaveTextContent('Готовится');

  fireEvent.click(card);
  expect(onStartRound).not.toHaveBeenCalled();
});

it('заполнение карты идёт своим раундом, а не упражнением', () => {
  const { onStartFillRound, onStartRound } = renderHome();

  fireEvent.click(screen.getByRole('button', { name: /Заполнить карту/ }));

  expect(onStartFillRound).toHaveBeenCalledWith(3);
  expect(onStartRound).not.toHaveBeenCalled();
});

it('объявленный, но ещё не написанный режим выключен и назван готовящимся', () => {
  renderHome();

  const card = screen.getByRole('button', { name: /История: династии и даты/ });

  expect(card).toBeDisabled();
  expect(card).toHaveTextContent('Готовится');
});

it('ведёт в атлас', () => {
  const { onOpenAtlas } = renderHome();

  fireEvent.click(screen.getByRole('button', { name: /Открыть атлас/ }));

  expect(onOpenAtlas).toHaveBeenCalled();
});

it('ведёт в раздел коллекций', () => {
  const { onOpenCollections } = renderHome();

  fireEvent.click(screen.getByRole('button', { name: /Все коллекции/ }));

  expect(onOpenCollections).toHaveBeenCalled();
});

it('витрина коллекций фильтруется по группе', () => {
  const { onOpenCollection } = renderHome();

  fireEvent.click(screen.getByRole('button', { name: 'Культура и история 4' }));

  expect(
    screen.getByRole('button', { name: /Праздник весны/ }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /Великая стена/ }),
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Праздник весны/ }));
  expect(onOpenCollection).toHaveBeenCalledWith('spring-festival');
});

it('выбранная группа помечена не только цветом', () => {
  renderHome();

  const chip = screen.getByRole('button', { name: 'География 4' });
  fireEvent.click(chip);

  expect(chip).toHaveAttribute('aria-pressed', 'true');
});

it('витрина показывает четыре коллекции из двенадцати', () => {
  renderHome();

  const cards = screen
    .getAllByRole('listitem')
    .filter((item) => item.classList.contains('collection-card'));

  expect(collections).toHaveLength(12);
  expect(cards).toHaveLength(4);
});

it('раздел режимов принимает фокус: шапка ведёт на него по якорю', () => {
  const { container } = render(
    <HomePage
      regions={regions}
      attempts={[]}
      onStartRound={vi.fn()}
      onStartFillRound={vi.fn()}
      onOpenAtlas={vi.fn()}
      onOpenCollections={vi.fn()}
      onOpenCollection={vi.fn()}
    />,
  );

  const modes = container.querySelector('#modes');

  expect(modes).not.toBeNull();
  expect(modes).toHaveAttribute('tabindex', '-1');
  expect(within(modes as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
    'Режимы',
  );
});
