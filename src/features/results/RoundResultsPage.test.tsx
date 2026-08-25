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
  targetsToReview: [
    { kind: 'region', id: 'sichuan' },
    { kind: 'region', id: 'yunnan' },
  ],
};

function renderResults(
  overrides: Partial<ComponentProps<typeof RoundResultsPage>> = {},
) {
  render(
    <RoundResultsPage
      summary={SUMMARY}
      targets={regions}
      bestAccuracy={0.9}
      isProgressSaved
      idsToRepeat={['sichuan', 'yunnan']}
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

  fireEvent.click(screen.getByRole('button', { name: /^Повторить ошибки/ }));

  expect(repeat).toHaveBeenCalledOnce();
});

it('не предлагает повторить ошибки, когда их нет', () => {
  renderResults({
    summary: { ...SUMMARY, correct: 34, accuracy: 1, targetsToReview: [] },
    idsToRepeat: [],
  });

  expect(screen.queryByRole('button', { name: /^Повторить ошибки/ })).toBeNull();
  expect(screen.getByText('Ошибок нет.')).toBeInTheDocument();
});

it('кнопка называет, сколько регионов войдёт в повтор', () => {
  // Раунд показывает не больше пяти тем, а повтор берёт все ошибки за 14 дней.
  renderResults({
    idsToRepeat: [
      'sichuan',
      'yunnan',
      'hunan',
      'hebei',
      'gansu',
      'jilin',
      'anhui',
    ],
  });

  expect(
    screen.getByRole('button', { name: 'Повторить ошибки: 7 регионов' }),
  ).toBeInTheDocument();
});

it('объясняет, что список — ошибки этого раунда, а повтор шире', () => {
  renderResults({
    idsToRepeat: ['sichuan', 'yunnan', 'hunan', 'hebei'],
  });

  expect(
    screen.getByText(
      'Здесь ошибки этого раунда. В повтор войдут все 4 региона с ошибками за последние 14 дней.',
    ),
  ).toBeInTheDocument();
});

it('не объясняет ничего, когда повтор совпадает со списком', () => {
  renderResults();

  expect(screen.queryByText(/за последние 14 дней/)).toBeNull();
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
  fireEvent.click(screen.getByRole('button', { name: 'На главную' }));

  expect(newRound).toHaveBeenCalledOnce();
  expect(exit).toHaveBeenCalledOnce();
});
