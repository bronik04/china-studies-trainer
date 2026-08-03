import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import type { RoundSummary } from '../../domain/progress-rules';
import { RoundResultsPage } from './RoundResultsPage';

const SUMMARY: RoundSummary = {
  total: 34,
  correct: 30,
  accuracy: 30 / 34,
  durationMs: 245_000,
  regionIdsToReview: ['sichuan', 'yunnan'],
};

function renderResults(
  overrides: Partial<ComponentProps<typeof RoundResultsPage>> = {},
) {
  render(
    <RoundResultsPage
      summary={SUMMARY}
      regions={regions}
      bestAccuracy={0.9}
      isProgressSaved
      onRepeatMistakes={() => {}}
      onNewRound={() => {}}
      onExit={() => {}}
      {...overrides}
    />,
  );
}

it('показывает точность и число верных ответов', () => {
  renderResults();

  expect(screen.getByText('88%')).toBeInTheDocument();
  expect(screen.getByText('30 из 34')).toBeInTheDocument();
});

it('показывает время без оценки', () => {
  renderResults();

  expect(screen.getByText('Время: 4 мин 5 с')).toBeInTheDocument();
});

it('называет темы для повторения', () => {
  renderResults();

  expect(screen.getByText(/Сычуань/)).toBeInTheDocument();
  expect(screen.getByText(/Юньнань/)).toBeInTheDocument();
});

it('показывает личный рекорд', () => {
  renderResults();

  expect(screen.getByText('Личный рекорд: 90%')).toBeInTheDocument();
});

it('предлагает повторить ошибки', () => {
  const repeat = vi.fn();
  renderResults({ onRepeatMistakes: repeat });

  fireEvent.click(screen.getByRole('button', { name: 'Повторить ошибки' }));

  expect(repeat).toHaveBeenCalledOnce();
});

it('не предлагает повторить ошибки, когда их нет', () => {
  renderResults({
    summary: { ...SUMMARY, correct: 34, accuracy: 1, regionIdsToReview: [] },
  });

  expect(screen.queryByRole('button', { name: 'Повторить ошибки' })).toBeNull();
  expect(screen.getByText('Ошибок нет.')).toBeInTheDocument();
});

it('предупреждает, когда прогресс не сохраняется', () => {
  renderResults({ isProgressSaved: false });

  expect(screen.getByRole('status')).toHaveTextContent(
    'Прогресс не сохранится: хранилище недоступно.',
  );
});

it('начинает новый раунд и возвращает к теме', () => {
  const newRound = vi.fn();
  const exit = vi.fn();
  renderResults({ onNewRound: newRound, onExit: exit });

  fireEvent.click(screen.getByRole('button', { name: 'Новый раунд' }));
  fireEvent.click(screen.getByRole('button', { name: 'К теме' }));

  expect(newRound).toHaveBeenCalledOnce();
  expect(exit).toHaveBeenCalledOnce();
});
