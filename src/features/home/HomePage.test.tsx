import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { collections, collectionsInGroup } from '../../content/collections';
import { MODE_CARDS } from '../exercise/exercise-modes';
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
    onStartCityRound: vi.fn(),
    onStartCultureRound: vi.fn(),
    onStartHistoryRound: vi.fn(),
    onStartPhysicalRound: vi.fn(),
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

  expect(onStartRound).toHaveBeenCalledWith('find-on-map', 'ru', null);
});

it('карточка открытого режима запускает свой раунд', () => {
  const { onStartRound } = renderHome();

  fireEvent.click(screen.getByRole('button', { name: /Назвать регион/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));

  expect(onStartRound).toHaveBeenCalledWith('name-target', 'ru', null);
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
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));

  expect(onStartRound).toHaveBeenCalledWith('match-pair', 'ru', null);
});

/*
 * Ненаписанных режимов не осталось: «Культура» была последней. Проверяется то,
 * что теперь верно, — ни одна карточка не выключена и ни одна не помечена
 * готовящейся. Приём для пометки остаётся в коде: следующий объявленный режим
 * снова им воспользуется, и `ModeCard` держит вид `planned` ради этого.
 */
it('все объявленные режимы написаны и запускаются', () => {
  renderHome();

  const cards = screen
    .getAllByRole('button')
    .filter((button) => button.closest('.mode-card') !== null);

  expect(cards).toHaveLength(MODE_CARDS.length);
  for (const card of cards) {
    expect(card, card.textContent ?? '').toBeEnabled();
  }
  expect(screen.queryByText('Готовится')).not.toBeInTheDocument();
});

it('заполнение карты идёт своим раундом, а не упражнением', () => {
  const { onStartFillRound, onStartRound } = renderHome();

  fireEvent.click(screen.getByRole('button', { name: /Заполнить карту/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));

  expect(onStartFillRound).toHaveBeenCalledWith('ru');
  expect(onStartRound).not.toHaveBeenCalled();
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

/* Счёт в подписи чипа берётся из каталога, а не пишется в тесте руками. */
it('выбранная группа помечена не только цветом', () => {
  renderHome();

  const inGroup = collectionsInGroup('geography').length;
  const chip = screen.getByRole('button', { name: `География ${inGroup}` });
  fireEvent.click(chip);

  expect(chip).toHaveAttribute('aria-pressed', 'true');
});

it('витрина показывает четыре коллекции из всего каталога', () => {
  renderHome();

  const cards = screen
    .getAllByRole('listitem')
    .filter((item) => item.classList.contains('collection-card'));

  expect(collections.length).toBeGreaterThan(4);
  expect(cards).toHaveLength(4);
});

it('раздел режимов принимает фокус: шапка ведёт на него по якорю', () => {
  const { container } = render(
    <HomePage
      regions={regions}
      attempts={[]}
      onStartRound={vi.fn()}
      onStartFillRound={vi.fn()}
      onStartCityRound={vi.fn()}
      onStartCultureRound={vi.fn()}
      onStartHistoryRound={vi.fn()}
      onStartPhysicalRound={vi.fn()}
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

function openCard(title: string | RegExp): void {
  fireEvent.click(screen.getByRole('button', { name: title }));
}

it('спрашивает язык перед стартом, а не запускает раунд сразу', () => {
  const { onStartRound } = renderHome();

  openCard(/Найти на карте/);

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(onStartRound).not.toHaveBeenCalled();
});

it('запускает игру на выбранном языке', () => {
  const { onStartRound } = renderHome();

  openCard(/Найти на карте/);
  fireEvent.click(screen.getByRole('radio', { name: '中文' }));
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));

  expect(onStartRound).toHaveBeenCalledWith('find-on-map', 'zh', null);
});

it('«Отмена» закрывает окно и ничего не запускает', () => {
  const { onStartRound } = renderHome();

  openCard(/Найти на карте/);
  fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

  expect(screen.queryByRole('dialog')).toBeNull();
  expect(onStartRound).not.toHaveBeenCalled();
});

it('умолчание в окне берётся из языка последней попытки', () => {
  renderHome([
    {
      questionId: '1-gansu',
      roundId: 'r1',
      target: { kind: 'region', id: 'gansu' },
      exerciseType: 'find-on-map',
      language: 'zh',
      isCorrect: true,
      durationMs: 1000,
      answeredAt: new Date().toISOString(),
    },
  ]);

  openCard(/Найти на карте/);

  expect(screen.getByRole<HTMLInputElement>('radio', { name: '中文' }).checked).toBe(
    true,
  );
});

it('окно называет игру, в которую попадёшь', () => {
  renderHome();

  openCard(/Заполнить карту/);

  expect(screen.getByRole('heading', { name: 'Заполнить карту' })).toBeInTheDocument();
});

it('показывает обе игры по физической географии', () => {
  renderHome();

  expect(
    screen.getByRole('button', { name: /Найти на физической карте/ }),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Назвать объект/ })).toBeInTheDocument();
});
