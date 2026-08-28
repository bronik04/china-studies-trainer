import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { dynasties, spanLabel } from '../../content/dynasties';
import { OrderRound } from './OrderRound';

function renderRound(seed = 1) {
  const onFinish = vi.fn();
  const onExit = vi.fn();

  render(
    <OrderRound
      language="ru"
      roundId="round-1"
      seed={seed}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );

  return { onFinish, onExit };
}

/** Карточка имени под лентой. */
function tile(name: string): HTMLElement {
  const tiles = document.querySelector('.order-tiles') as HTMLElement;

  return within(tiles).getByRole('button', { name });
}

/** Полоса-цель на ленте: она названа сроком, а не именем. */
function band(dynastyId: string): HTMLElement {
  const dynasty = dynasties.find((item) => item.id === dynastyId)!;
  const timeline = document.querySelector('.dynasty-timeline') as HTMLElement;

  return within(timeline).getByRole('button', { name: spanLabel(dynasty) });
}

/** Имена круга, которые ещё не поставлены: порядок задаёт сид. */
function pendingNames(): string[] {
  return [...document.querySelectorAll('.order-tile')].map(
    (node) => node.textContent ?? '',
  );
}

it('под лентой лежат четыре имени, а лента безымянна', () => {
  renderRound();

  expect(document.querySelectorAll('.order-tile')).toHaveLength(4);
  expect(document.querySelectorAll('.timeline-name')).toHaveLength(0);
});

it('имя ставится выбором карточки и нажатием по полосе', () => {
  renderRound();

  const name = pendingNames()[0];
  const dynasty = dynasties.find((item) => item.nameRu === name)!;

  fireEvent.click(tile(name));
  fireEvent.click(band(dynasty.id));

  expect(document.querySelectorAll('.order-tile')).toHaveLength(3);
  expect(
    document.querySelector(`[data-dynasty-id='${dynasty.id}']`),
  ).toHaveAttribute('data-mark', 'taken');
});

/* Пока имя не выбрано, лента ничего не делает: класть нечего. */
it('нажатие по ленте без выбранного имени ничего не ставит', () => {
  renderRound();

  const dynasty = dynasties.find((item) => item.nameRu === pendingNames()[0])!;
  fireEvent.click(band(dynasty.id));

  expect(document.querySelectorAll('.order-tile')).toHaveLength(4);
});

it('ошибка возвращает имя в набор и говорит, сколько попыток осталось', () => {
  renderRound();

  const name = pendingNames()[0];
  const dynasty = dynasties.find((item) => item.nameRu === name)!;
  const wrong = dynasties.find((item) => item.id !== dynasty.id)!;

  fireEvent.click(tile(name));
  fireEvent.click(band(wrong.id));

  expect(document.querySelectorAll('.order-tile')).toHaveLength(4);
  expect(screen.getByText(/Осталось попыток: 2/)).toBeInTheDocument();
});

it('выбранная карточка помечена для читалки экрана', () => {
  renderRound();

  const name = pendingNames()[0];
  fireEvent.click(tile(name));

  expect(tile(name)).toHaveAttribute('aria-pressed', 'true');
});

it('раунд заканчивается попытками по всем династиям', () => {
  const { onFinish } = renderRound();

  for (let index = 0; index < dynasties.length; index += 1) {
    const name = pendingNames()[0];
    const dynasty = dynasties.find((item) => item.nameRu === name)!;
    fireEvent.click(tile(name));
    fireEvent.click(band(dynasty.id));
  }

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish.mock.calls[0][0]).toHaveLength(dynasties.length);
  expect(onFinish.mock.calls[0][0][0].target.kind).toBe('history');
});

/* Повтор ошибок даёт короткий пул: круг должен собраться неполным. */
it('короткий пул укладывается в один неполный круг', () => {
  render(
    <OrderRound
      dynasties={dynasties.slice(0, 2)}
      language="ru"
      roundId="round-2"
      seed={1}
      onFinish={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  expect(document.querySelectorAll('.order-tile')).toHaveLength(2);
  expect(screen.getByText(/Круг 1 из 1/)).toBeInTheDocument();
});
