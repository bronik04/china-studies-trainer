import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { regions } from '../../content/regions';
import type { Attempt } from '../../domain/round';
import { HomePage } from './HomePage';

function renderHome(attempts: readonly Attempt[] = []) {
  const onStartRound = vi.fn();
  const onStartFillRound = vi.fn();
  const onOpenAtlas = vi.fn();

  render(
    <HomePage
      regions={regions}
      attempts={attempts}
      onStartRound={onStartRound}
      onStartFillRound={onStartFillRound}
      onOpenAtlas={onOpenAtlas}
    />,
  );

  return { onStartRound, onStartFillRound, onOpenAtlas };
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

it('выбор уровня не стоит на верхнем уровне экрана', () => {
  renderHome();

  expect(screen.queryByRole('group', { name: 'Уровень' })).not.toBeInTheDocument();
});

it('другие режимы доступны и запускают свой раунд', () => {
  const { onStartRound, onStartFillRound } = renderHome();

  fireEvent.click(screen.getByText(/Другие режимы/));
  fireEvent.click(screen.getByRole('button', { name: 'Регион — столица' }));
  expect(onStartRound).toHaveBeenCalledWith('match-capital', 1, null);

  fireEvent.click(screen.getByRole('button', { name: 'Заполнить карту' }));
  expect(onStartFillRound).toHaveBeenCalledWith(1);
});

it('ведёт в атлас', () => {
  const { onOpenAtlas } = renderHome();

  fireEvent.click(screen.getByRole('button', { name: /Открыть атлас/ }));

  expect(onOpenAtlas).toHaveBeenCalled();
});
