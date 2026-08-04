import { render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import {
  answerFillRound,
  createFillRound,
  currentTarget,
  type FillRound,
} from '../../domain/fill-round';
import { createSeededRandom } from '../../domain/random';
import { FillMapResultsPage } from './FillMapResultsPage';

function finishedRound(): FillRound {
  let round = createFillRound(regions, {
    roundId: 'r1',
    level: 1,
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

function renderResults(round: FillRound = finishedRound()) {
  return render(
    <FillMapResultsPage
      round={round}
      regions={regions}
      isProgressSaved
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
