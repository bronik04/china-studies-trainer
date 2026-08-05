import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import App from './App';
import { cityById } from './content/cities';
import { regions } from './content/regions';
import type { Region } from './content/types';

/**
 * Хранилище подменяется картой в памяти: приложение читает прогресс при
 * монтировании, поэтому засеять его можно только до `render`.
 *
 * Хранилище пустое и своё у каждого теста, а подмена снимается после него.
 * Без этого пройденный раунд утекал бы в следующие тесты файла: приложение
 * пишет прогресс, а «повторить ошибки» его читает.
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

beforeEach(() => {
  installMemoryStorage({});
});

it('открывается главной, а не сразу раундом', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Китай на карте, а не в списке' }),
  ).toBeInTheDocument();
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
  expect(
    screen.getByRole('heading', { name: 'Китай на карте, а не в списке' }),
  ).toBeInTheDocument();
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

/*
 * Шапка закреплена и стоит везде, включая экраны ответа: решение владельца
 * продукта отменяет прежнее «на экранах ответа шапки нет».
 */
it('шапка стоит и на экране ответа', () => {
  render(<App />);

  expect(
    screen.getByRole('navigation', { name: 'Разделы сайта' }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^Начать/ }));

  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();
  expect(
    screen.getByRole('navigation', { name: 'Разделы сайта' }),
  ).toBeInTheDocument();
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
  expect(
    screen.getByRole('heading', { name: 'Китай на карте, а не в списке' }),
  ).toBeInTheDocument();
});

/**
 * Полный раунд проверяется в режиме «регион — столица»: на вопрос
 * отрисовываются четыре кнопки вместо карты с 34 областями и списка-дублёра.
 * Проверяемое поведение от режима не зависит, а раунд идёт в разы быстрее.
 *
 */
/** Название административного центра региона: оно живёт в справочнике городов. */
function capitalOf(region: Region): string {
  return cityById(region.capitalCityId)!.nameRu;
}

function answerCapital(correct: boolean): void {
  const asked = screen.getByTestId('exercise-target').textContent;
  /*
   * Регион ищется по обоим названиям: тест не должен зависеть от того, на
   * каком языке идёт раунд.
   */
  const target = regions.find(
    (region) => region.nameRu === asked || region.nameZh === asked,
  )!;
  const options = screen.getAllByTestId('choice-option');

  fireEvent.click(
    options.find((option) =>
      correct
        ? option.textContent === capitalOf(target)
        : option.textContent !== capitalOf(target),
    )!,
  );
}

/*
 * Верный ответ переводит вопрос сам, по таймеру; ошибка ждёт «Далее». Поэтому
 * раунд из одних верных ответов проходится на поддельных часах, а раунд из
 * ошибок — нажатиями, как и раньше.
 */
function finishRound(correct: boolean): void {
  if (!correct) {
    for (let index = 0; index < 34; index += 1) {
      answerCapital(false);
      fireEvent.click(
        screen.getByRole('button', {
          name: index === 33 ? 'Завершить раунд' : 'Далее',
        }),
      );
    }

    return;
  }

  vi.useFakeTimers();
  try {
    for (let index = 0; index < 34; index += 1) {
      answerCapital(true);
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }
  } finally {
    vi.useRealTimers();
  }
}

function startCapitalRound(): void {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Регион — столица/ }));
  // Карточка спрашивает язык окном, и раунд начинается из него.
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));
}

it('показывает итог после раунда и возвращает на главную', () => {
  startCapitalRound();
  finishRound(true);

  expect(screen.getByText('100%')).toBeInTheDocument();
  expect(screen.getByText('34 из 34')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'В кабинет' }));

  expect(
    screen.getByRole('heading', { name: 'Китай на карте, а не в списке' }),
  ).toBeInTheDocument();
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

/*
 * Игры равноправны: запирать одну за другой значило бы решать за ученика, что
 * ему сейчас интересно. Закрытой карточка бывает только пока режим не написан.
 */
it('все написанные игры открыты сразу, без всякой истории', () => {
  render(<App />);

  for (const name of [
    /Найти на карте/,
    /Назвать регион/,
    /Регион — столица/,
    /Заполнить карту/,
  ]) {
    expect(screen.getByRole('button', { name })).toBeEnabled();
  }

  expect(
    screen.getByRole('button', { name: /История: династии и даты/ }),
  ).toBeDisabled();
});
