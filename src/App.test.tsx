import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import App from './App';
import { regions } from './content/regions';
import type { Attempt, Level } from './domain/round';

/**
 * Хранилище подменяется картой в памяти: приложение читает прогресс при
 * монтировании, поэтому засеять его можно только до `render`.
 *
 * Подмена снимается после каждого теста. Без этого засеянный прогресс утекал
 * бы в следующие тесты файла и открывал бы им уровни, которых они не
 * заслуживали.
 */
const realStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

function installMemoryStorage(seed: Record<string, string>): void {
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

afterEach(() => {
  if (realStorage !== undefined) {
    Object.defineProperty(window, 'localStorage', realStorage);
  }
});

function seedAttempts(attempts: readonly Attempt[]): void {
  installMemoryStorage({
    'china-studies-trainer/progress': JSON.stringify({
      schemaVersion: 1,
      attempts,
      masteredRegionIds: [],
      /* Поле намеренно отстало: открытый уровень выводится из истории. */
      unlockedLevel: 1,
    }),
  });
}

/** Два безошибочных раунда уровня открывают следующий: см. progress-rules.ts. */
function perfectRounds(level: Level): readonly Attempt[] {
  return [`r${level}-1`, `r${level}-2`].flatMap((roundId) =>
    regions.map((region) => ({
      questionId: `${level}-${region.id}`,
      roundId,
      regionId: region.id,
      exerciseType: 'find-on-map' as const,
      level,
      isCorrect: true,
      durationMs: 1000,
      answeredAt: '2026-08-03T10:00:00.000Z',
    })),
  );
}

it('открывается главной, а не сразу раундом', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Китай на карте, а не в списке' }),
  ).toBeInTheDocument();
  expect(screen.getByTestId('progress-status')).toHaveTextContent(
    'Освоено 0 из 34',
  );
});

it('на главной ровно одна главная кнопка', () => {
  render(<App />);

  const primary = screen
    .getAllByRole('button')
    .filter((button) => button.classList.contains('primary'));

  expect(primary).toHaveLength(1);
});

it('ведёт с главной в атлас и обратно', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Открыть атлас/ }));
  expect(screen.getByTestId('atlas-region-card')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /В кабинет/ }));
  expect(screen.getByTestId('progress-status')).toBeInTheDocument();
});

it('шапка ведёт в атлас и в коллекции', () => {
  render(<App />);

  const nav = screen.getByRole('navigation', { name: 'Разделы сайта' });

  fireEvent.click(screen.getByRole('button', { name: 'Атлас' }));
  expect(screen.getByTestId('atlas-region-card')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Коллекции' }));
  expect(
    screen.getByRole('heading', {
      name: 'Места и явления, к которым привязаны вопросы',
    }),
  ).toBeInTheDocument();
  expect(nav).toBeInTheDocument();
});

it('шапки нет там, где отвечают: раунд занимает ровно кадр', () => {
  render(<App />);

  expect(
    screen.getByRole('navigation', { name: 'Разделы сайта' }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^Начать/ }));

  expect(
    screen.queryByRole('navigation', { name: 'Разделы сайта' }),
  ).not.toBeInTheDocument();
});

it('ведёт с главной на страницу коллекции и обратно в раздел', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Великая стена/ }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Великая стена',
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Коллекции', current: false }),
  );
  expect(
    screen.getByRole('heading', {
      name: 'Места и явления, к которым привязаны вопросы',
    }),
  ).toBeInTheDocument();
});

it('коллекция запускает раунд ровно по своим регионам', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Великая стена/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Спросить эти регионы' }));

  expect(screen.getByText(/Вопрос 1 из 9/)).toBeInTheDocument();
});

it('атлас держит выбор региона в состоянии приложения', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Открыть атлас/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Сычуань (四川省)' }));

  expect(screen.getByTestId('atlas-region-card')).toHaveTextContent('Сычуань');
});

it('главная кнопка запускает раунд и возвращает обратно', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^Начать/ }));
  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Прервать раунд' }));
  expect(screen.getByTestId('progress-status')).toBeInTheDocument();
});

/**
 * Полный раунд проверяется в режиме «регион — столица»: на вопрос
 * отрисовываются четыре кнопки вместо карты с 34 областями и списка-дублёра.
 * Проверяемое поведение от режима не зависит, а раунд идёт в разы быстрее.
 *
 * Режим живёт на втором уровне, поэтому прогресс засевается заранее: на
 * первом визите его карточка закрыта и об этом прямо написано.
 */
function answerCapital(correct: boolean): void {
  const asked = screen.getByTestId('exercise-target').textContent;
  /*
   * На втором уровне вопрос называет регион иероглифами, а не по-русски
   * (`REPRESENTATIONS_BY_LEVEL`), поэтому регион ищется по любому из его
   * представлений — тест не должен зависеть от того, каким уровнем идёт раунд.
   */
  const target = regions.find(
    (region) =>
      region.nameRu === asked ||
      region.nameZh === asked ||
      region.pinyin === asked,
  )!;
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

function startCapitalRound(): void {
  seedAttempts(perfectRounds(1));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Регион — столица/ }));
}

it('показывает итог после раунда и возвращает на главную', () => {
  startCapitalRound();
  finishRound(true);

  expect(screen.getByText('100%')).toBeInTheDocument();
  expect(screen.getByText('34 из 34')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'В кабинет' }));

  expect(screen.getByTestId('progress-status')).toBeInTheDocument();
});

it('повторяет все ошибки, а не только показанные пять, и говорит об этом', () => {
  startCapitalRound();
  finishRound(false);

  expect(screen.getByText('0%')).toBeInTheDocument();

  // Подпись кнопки — то же число, что и длина раунда: экран показывает пять
  // тем, а повтор берёт все 34 ошибки.
  fireEvent.click(
    screen.getByRole('button', { name: 'Повторить ошибки: 34 региона' }),
  );

  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();
}, 20_000);

it('проходит раунд «регион — столица»', () => {
  startCapitalRound();

  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();
  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
});

it('показывает уровень в ходе раунда', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Найти на карте/ }));

  expect(screen.getByText(/уровень 1/)).toBeInTheDocument();
});

it('открывает уровень по истории, даже если сохранённое поле отстало', () => {
  seedAttempts(perfectRounds(1));

  render(<App />);

  const card = screen.getByRole('button', { name: /Регион — столица/ });

  expect(card).toBeEnabled();
  expect(card).toHaveTextContent('Уровень 2');
  expect(screen.getByTestId('progress-status')).toHaveTextContent(
    'открыт уровень 2',
  );
});
