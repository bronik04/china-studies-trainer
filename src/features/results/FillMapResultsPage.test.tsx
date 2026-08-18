import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import {
  answerFillRound,
  createFillRound,
  currentTarget,
  isFillRoundFinished,
  type FillRound,
} from '../../domain/fill-round';
import { createSeededRandom } from '../../domain/random';
import { FillMapResultsPage } from './FillMapResultsPage';
import { describe, it, expect, vi } from 'vitest';

function finishedRound(): FillRound {
  let round = createFillRound(regions, {
    roundId: 'r1',
    language: 'ru',
    random: createSeededRandom(1),
  });

  for (let i = 0; i < regions.length; i += 1) {
    round = answerFillRound(round, {
      answeredRegionId: currentTarget(round).regionId,
      durationMs: 1000,
      answeredAt: '2026-08-04T10:00:00.000Z',
    }).round;
  }

  return round;
}

/** Первый регион берётся со второй попытки: в раунде есть что повторять. */
function roundWithMistake(): FillRound {
  let round = createFillRound(regions, {
    roundId: 'r1',
    language: 'ru',
    random: createSeededRandom(1),
  });

  const asked = currentTarget(round).regionId;
  const other = regions.find((region) => region.id !== asked)!.id;
  round = answerFillRound(round, {
    answeredRegionId: other,
    durationMs: 1000,
    answeredAt: '2026-08-04T10:00:00.000Z',
  }).round;

  while (!isFillRoundFinished(round)) {
    round = answerFillRound(round, {
      answeredRegionId: currentTarget(round).regionId,
      durationMs: 1000,
      answeredAt: '2026-08-04T10:00:00.000Z',
    }).round;
  }

  return round;
}

type RenderOverrides = {
  readonly round?: FillRound;
  readonly idsToRepeat?: readonly string[];
  readonly onRepeatMistakes?: () => void;
};

function renderResults({
  round = finishedRound(),
  idsToRepeat = [],
  onRepeatMistakes = () => {},
}: RenderOverrides = {}) {
  return render(
    <FillMapResultsPage
      round={round}
      regions={regions}
      isProgressSaved
      idsToRepeat={idsToRepeat}
      onRepeatMistakes={onRepeatMistakes}
      onNewRound={() => {}}
      onExit={() => {}}
    />,
  );
}

it('показывает разбивку по исходам', () => {
  renderResults();

  const breakdown = screen.getByTestId('fill-breakdown');

  expect(breakdown).toHaveTextContent('С первого раза: 34');
  expect(breakdown).toHaveTextContent('Со второго: 0');
  expect(breakdown).toHaveTextContent('Не угадано: 0');
});

it('показывает заполненную карту', () => {
  const { container } = renderResults();

  expect(container.querySelector('[data-map-variant="fill"]')).not.toBeNull();
  expect(
    container.querySelector('[data-region-id="sichuan"]')?.getAttribute('data-outcome'),
  ).toBe('first-try');
});

it('называет время раунда', () => {
  renderResults();

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('34 с');
});

describe('кнопка «Повторить ошибки»', () => {
  it('на чистом раунде кнопки «Повторить ошибки» нет, даже если история непуста', () => {
    renderResults({ idsToRepeat: ['sichuan'] });

    expect(screen.queryByRole('button', { name: /Повторить ошибки/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Заполнить заново' })).toHaveClass(
      'primary',
    );
  });

  it('кнопка повтора называет число из истории и зовёт обработчик', () => {
    const onRepeatMistakes = vi.fn();
    renderResults({
      round: roundWithMistake(),
      idsToRepeat: ['a', 'b', 'c'],
      onRepeatMistakes,
    });

    const repeat = screen.getByRole('button', {
      name: 'Повторить ошибки: 3 региона',
    });
    fireEvent.click(repeat);

    expect(onRepeatMistakes).toHaveBeenCalledTimes(1);
    expect(repeat).toHaveClass('primary');
    expect(screen.getByRole('button', { name: 'Заполнить заново' })).toHaveClass(
      'secondary',
    );
  });

  it('говорит, что повтор шире списка этого раунда', () => {
    renderResults({ round: roundWithMistake(), idsToRepeat: ['a', 'b', 'c'] });

    expect(
      screen.getByText(
        /В повтор войдут все 3 региона с ошибками за последние 14 дней/,
      ),
    ).toBeInTheDocument();
  });

  it('не поясняет, когда повтор совпадает со списком раунда', () => {
    renderResults({ round: roundWithMistake(), idsToRepeat: ['a'] });

    expect(screen.queryByText(/за последние 14 дней/)).toBeNull();
  });
});
