import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { regions } from './content/regions';

it('shows the topic page', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Провинции и столицы Китая' }),
  ).toBeInTheDocument();
});

it('shows the interactive map and keeps its selection in the page state', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Интерактивная карта' }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Сычуань (四川省)' }));

  expect(screen.getByRole('status')).toHaveTextContent('Выбрано: Сычуань (四川省)');
});

it('открывает упражнение и возвращается к теме', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Найти на карте' }));
  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Прервать раунд' }));
  expect(
    screen.getByRole('heading', { name: 'Провинции и столицы Китая' }),
  ).toBeInTheDocument();
});


/**
 * Полный раунд проверяется в режиме «регион — столица»: на вопрос
 * отрисовываются четыре кнопки вместо карты с 34 областями и списка-дублёра.
 * Проверяемое поведение от режима не зависит, а раунд идёт в разы быстрее.
 */
function answerCapital(correct: boolean): void {
  const asked = screen.getByTestId('exercise-target').textContent;
  const target = regions.find((region) => region.nameRu === asked)!;
  const options = screen.getAllByTestId('choice-option');

  fireEvent.click(
    options.find((option) =>
      correct
        ? option.textContent === target.capitalRu
        : option.textContent !== target.capitalRu,
    )!,
  );
}

function finishRound(correct: boolean): void {
  for (let index = 0; index < 34; index += 1) {
    answerCapital(correct);
    fireEvent.click(
      screen.getByRole('button', {
        name: index === 33 ? 'Завершить раунд' : 'Далее',
      }),
    );
  }
}

it('показывает итог после раунда и возвращает к теме', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Регион — столица' }));
  finishRound(true);

  expect(screen.getByText('100%')).toBeInTheDocument();
  expect(screen.getByText('34 из 34')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'К теме' }));

  expect(
    screen.getByRole('heading', { name: 'Провинции и столицы Китая' }),
  ).toBeInTheDocument();
});


it('повторяет все ошибки, а не только показанные пять', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Регион — столица' }));
  finishRound(false);

  expect(screen.getByText('0%')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Повторить ошибки' }));

  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();
}, 20_000);

it('проходит раунд «регион — столица»', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Регион — столица' }));

  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();
  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
});

it('показывает уровень в ходе раунда', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Найти на карте' }));

  expect(screen.getByText(/уровень 1/)).toBeInTheDocument();
});

function useMemoryStorage(seed: Record<string, string>): void {
  const data = new Map(Object.entries(seed));
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return data.size;
      },
      clear: () => data.clear(),
      getItem: (key: string) => data.get(key) ?? null,
      key: (index: number) => [...data.keys()][index] ?? null,
      removeItem: (key: string) => void data.delete(key),
      setItem: (key: string, value: string) => void data.set(key, value),
    },
  });
}

it('открывает уровень по истории, даже если сохранённое поле отстало', () => {
  const attempts = ['r1', 'r2'].flatMap((roundId) =>
    Array.from({ length: 10 }, (_, index) => ({
      questionId: `${index}-q`,
      roundId,
      regionId: `region-${index}`,
      exerciseType: 'find-on-map' as const,
      level: 1 as const,
      isCorrect: index < 9,
      durationMs: 1000,
      answeredAt: '2026-08-03T10:00:00.000Z',
    })),
  );
  useMemoryStorage({
    'china-studies-trainer/progress': JSON.stringify({
      schemaVersion: 1,
      attempts,
      masteredRegionIds: [],
      unlockedLevel: 1,
    }),
  });

  render(<App />);

  expect(screen.getByRole('radio', { name: 'Уровень 2' })).toBeInTheDocument();
});
