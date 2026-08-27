import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { dynasties, spanLabel } from '../../content/dynasties';
import { createSeededRandom } from '../../domain/random';
import { buildDynastyChoices } from '../../domain/dynasty-choices';
import { HistoryRound } from './HistoryRound';
import { CORRECT_PAUSE_MS, WRONG_PAUSE_MS } from './round-pace';

function renderRound(seed = 5) {
  const onFinish = vi.fn();
  const onExit = vi.fn();

  render(
    <HistoryRound
      language="ru"
      roundId="round-1"
      seed={seed}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );

  return { onFinish, onExit };
}

/**
 * Кнопка варианта с этим сроком. Поиск по всему экрану не годится: после
 * ответа тот же срок стоит и в плашке, и подписью на ленте.
 */
function choiceWith(label: string): HTMLElement {
  const option = screen
    .getAllByTestId('choice-option')
    .find((item) => item.textContent?.includes(label));

  if (option === undefined) {
    throw new Error(`Среди вариантов нет срока ${label}`);
  }

  return option;
}

/** Династия, которую раунд спросил первой: порядок задаёт сид. */
function askedName(): string {
  return screen.getByTestId('exercise-target').textContent ?? '';
}

function askedDynasty() {
  const name = askedName();

  return dynasties.find((dynasty) => name.includes(dynasty.nameRu))!;
}

it('спрашивает династию и предлагает четыре срока', () => {
  renderRound();

  expect(askedDynasty()).toBeDefined();
  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
});

it('верный ответ засчитывается', () => {
  renderRound();

  const target = askedDynasty();
  fireEvent.click(choiceWith(spanLabel(target)));

  expect(choiceWith(spanLabel(target))).toHaveAttribute(
    'data-result',
    'correct',
  );
});

/*
 * После ошибки плашка называет верный срок, а лента подписывается: разбор
 * обязан показать не только какая дата верна, но и куда она попадает во
 * времени.
 */
it('после ошибки показывает верный срок и подписывает ленту', () => {
  renderRound();

  const target = askedDynasty();
  const wrong = buildDynastyChoices(
    dynasties,
    target.id,
    createSeededRandom(3),
  ).find((choice) => choice.id !== target.id)!;

  const wrongOption =
    screen
      .getAllByTestId('choice-option')
      .find((option) => option.textContent?.includes(spanLabel(wrong))) ??
    screen
      .getAllByTestId('choice-option')
      .find((option) => !option.textContent?.includes(spanLabel(target)))!;
  fireEvent.click(wrongOption);

  expect(screen.getByText(/Эту дату стоит повторить/)).toBeInTheDocument();
  expect(screen.getByTestId('exercise-target')).toHaveTextContent(
    spanLabel(target),
  );
  expect(document.querySelector('.history-note')).not.toBeNull();
});

/* Лента молчит, пока вопрос открыт: подписанная, она и есть ответ. */
it('не подписывает ленту до ответа', () => {
  renderRound();

  expect(document.querySelectorAll('.timeline-span text')).toHaveLength(0);
  expect(document.querySelector('.history-hint')).not.toBeNull();
});

/* Лента — не орган управления: отвечают кнопками, и читалке она не нужна. */
it('лента скрыта от читалки экрана и не принимает фокус', () => {
  renderRound();

  const timeline = document.querySelector('.dynasty-timeline')!;

  expect(timeline).toHaveAttribute('aria-hidden', 'true');
  expect(timeline.querySelector('[tabindex]')).toBeNull();
});

it('раунд идёт по всем династиям и заканчивается итогом', () => {
  const { onFinish } = renderRound();

  vi.useFakeTimers();
  try {
    for (let index = 0; index < dynasties.length; index += 1) {
      const target = askedDynasty();
      fireEvent.click(choiceWith(spanLabel(target)));
      act(() => {
        vi.advanceTimersByTime(CORRECT_PAUSE_MS + WRONG_PAUSE_MS);
      });
    }
  } finally {
    vi.useRealTimers();
  }

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish.mock.calls[0][0]).toHaveLength(dynasties.length);
  expect(onFinish.mock.calls[0][0][0].target.kind).toBe('history');
});

/* Один сид — один порядок: раунд обязан быть воспроизводим. */
it('повторяется по сиду', () => {
  renderRound(11);
  const first = askedName();
  screen.getByTestId('exercise-target').remove();

  render(
    <HistoryRound
      language="ru"
      roundId="round-2"
      seed={11}
      onFinish={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  expect(askedName()).toBe(first);
});

it('пул можно сузить: повтор ошибок спрашивает только их', () => {
  const onFinish = vi.fn();
  render(
    <HistoryRound
      dynasties={dynasties.slice(0, 2)}
      language="ru"
      roundId="round-3"
      seed={1}
      onFinish={onFinish}
      onExit={vi.fn()}
    />,
  );

  expect(screen.getByText(/Вопрос 1 из 2/)).toBeInTheDocument();
  /* Отвлекающие всё равно из полной ленты: иначе четвёртому неоткуда взяться. */
  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
});
