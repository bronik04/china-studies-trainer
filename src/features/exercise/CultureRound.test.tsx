import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { cultureCollectionsUpTo } from '../../content/culture-sets';
import { CultureRound } from './CultureRound';
import { CORRECT_PAUSE_MS, WRONG_PAUSE_MS } from './round-pace';

const POOL = cultureCollectionsUpTo('culture');

function renderRound(seed = 4) {
  const onFinish = vi.fn();
  render(
    <CultureRound
      collections={POOL}
      language="ru"
      roundId="round-1"
      seed={seed}
      onFinish={onFinish}
      onExit={vi.fn()}
    />,
  );

  return { onFinish };
}

/** Что показано: снимок ведёт на файл коллекции, по нему её и опознаём. */
function askedId(): string {
  const src = document.querySelector('.culture-stage img')!.getAttribute('src')!;

  return /\/photos\/(.+)-\d+\.webp$/.exec(src)![1];
}

function askedCollection() {
  const photoId = askedId();

  return POOL.find((item) => item.photos.some((photo) => photo.id === photoId))!;
}

it('показывает снимок и четыре названия', () => {
  renderRound();

  expect(document.querySelector('.culture-stage img')).not.toBeNull();
  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
  expect(screen.getByTestId('exercise-target')).toHaveTextContent('Что на снимке');
});

/*
 * Подписи об авторе на снимке нет: она называет место и тем отвечает на
 * вопрос. Автор назван на странице коллекции, куда ведёт итог раунда.
 */
it('не подписывает снимок автором: подпись назвала бы ответ', () => {
  renderRound();

  expect(document.querySelector('.culture-stage figcaption')).toBeNull();
  expect(
    document.querySelector('.culture-stage img')?.getAttribute('alt'),
  ).toBe('');
});

it('верный ответ засчитывается', () => {
  renderRound();

  const target = askedCollection();
  const option = screen
    .getAllByTestId('choice-option')
    .find((item) => item.textContent?.includes(target.nameRu))!;
  fireEvent.click(option);

  expect(option).toHaveAttribute('data-result', 'correct');
});

it('после ошибки называет верный ответ и объясняет его', () => {
  renderRound();

  const target = askedCollection();
  const wrong = screen
    .getAllByTestId('choice-option')
    .find((item) => !item.textContent?.includes(target.nameRu))!;
  fireEvent.click(wrong);

  expect(screen.getByTestId('exercise-target')).toHaveTextContent(target.nameRu);
  expect(document.querySelector('.culture-note')).not.toBeNull();
});

it('раунд идёт по всем снимкам набора и заканчивается итогом', () => {
  const { onFinish } = renderRound();

  vi.useFakeTimers();
  try {
    for (let index = 0; index < POOL.length; index += 1) {
      const target = askedCollection();
      fireEvent.click(
        screen
          .getAllByTestId('choice-option')
          .find((item) => item.textContent?.includes(target.nameRu))!,
      );
      act(() => {
        vi.advanceTimersByTime(CORRECT_PAUSE_MS + WRONG_PAUSE_MS);
      });
    }
  } finally {
    vi.useRealTimers();
  }

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish.mock.calls[0][0]).toHaveLength(POOL.length);
  expect(onFinish.mock.calls[0][0][0].target.kind).toBe('collection');
});
