import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { collections } from '../../content/collections';
import { regions } from '../../content/regions';
import type { Attempt, Level } from '../../domain/round';
import { HomePage } from './HomePage';

/**
 * Два раунда первого уровня без ошибок открывают второй: UNLOCK_ROUNDS = 2,
 * UNLOCK_ACCURACY = 0.8. Собирается здесь, а не берётся готовым, потому что
 * карточки режимов гасятся именно по открытому уровню.
 */
function perfectRounds(level: Level): readonly Attempt[] {
  return ['round-1', 'round-2'].flatMap((roundId) =>
    regions.map((region) => ({
      questionId: `${level}-${region.id}`,
      roundId,
      regionId: region.id,
      exerciseType: 'find-on-map' as const,
      level,
      isCorrect: true,
      durationMs: 1000,
      answeredAt: '2026-08-03T12:00:00.000Z',
    })),
  );
}

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

it('строка состояния называет счёт числами, а не только цветом на карте', () => {
  renderHome();

  expect(screen.getByTestId('progress-status')).toHaveTextContent(
    'Освоено 0 из 34',
  );
});

it('легенда называет все три состояния карты словами', () => {
  renderHome();

  const legend = screen.getByTestId('progress-legend');

  expect(legend).toHaveTextContent('освоено');
  expect(legend).toHaveTextContent('в работе');
  expect(legend).toHaveTextContent('не тронуто');
});

it('карточка открытого режима запускает свой раунд', () => {
  const { onStartRound } = renderHome();

  fireEvent.click(screen.getByRole('button', { name: /Назвать регион/ }));

  expect(onStartRound).toHaveBeenCalledWith('name-region', 1, null);
});

it('карточка закрытого режима не запускается и объясняет, чем открывается', () => {
  const { onStartRound } = renderHome();

  const card = screen.getByRole('button', { name: /Регион — столица/ });

  expect(card).toBeDisabled();
  expect(card).toHaveTextContent('Откроется на уровне 2');

  fireEvent.click(card);
  expect(onStartRound).not.toHaveBeenCalled();
});

it('открытый уровень отпирает свою карточку', () => {
  const { onStartRound } = renderHome(perfectRounds(1));

  fireEvent.click(screen.getByRole('button', { name: /Регион — столица/ }));

  expect(onStartRound).toHaveBeenCalledWith('match-capital', 2, null);
});

it('заполнение карты идёт своим раундом, а не упражнением', () => {
  const { onStartFillRound, onStartRound } = renderHome([
    ...perfectRounds(1),
    ...perfectRounds(2),
  ]);

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

it('лестница уровней отмечает, какие ступени открыты', () => {
  renderHome(perfectRounds(1));

  const rungs = screen
    .getAllByRole('listitem')
    .filter((item) => item.dataset.open !== undefined);

  expect(rungs.map((item) => item.dataset.open)).toEqual([
    'true',
    'true',
    'false',
    'false',
  ]);
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
