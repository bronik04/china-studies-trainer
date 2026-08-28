import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { CORRECT_PAUSE_MS, WRONG_PAUSE_MS } from './features/exercise/round-pace';
import { MISS_FLASH_MS } from './features/exercise/FillMapRound';
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

/**
 * Экраны, кроме главной, приезжают отдельными кусками сборки, поэтому
 * появляются не в том же такте, что нажатие. Ожидание здесь не украшение: без
 * него тест проверял бы заглушку Suspense, а не экран. Ученик этого ожидания
 * не видит — куски дотянуты заранее, в простое после первого экрана.
 */
async function settle(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByText('Экран загружается.')).toBeNull();
  });
}

/*
 * Раунд начинается карточкой режима и окном перед стартом: в герое кнопки
 * запуска больше нет — главный шаг ведёт к выбору, а не запускает игру сам.
 */
function startFindOnMap(): void {
  fireEvent.click(screen.getByRole('button', { name: /Найти на карте/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));
}

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

it('ведёт с главной в атлас и обратно', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Исследовать карту/ }));
  await settle();
  expect(screen.getByTestId('atlas-region-card')).toBeInTheDocument();

  /*
   * Обратно — через марку в шапке: собственной кнопки выхода у атласа нет, и
   * этот путь единственный, каким ученик возвращается на главную.
   */
  fireEvent.click(screen.getByRole('button', { name: /Страноведение/ }));
  expect(
    screen.getByRole('heading', { name: 'Китай на карте, а не в списке' }),
  ).toBeInTheDocument();
});

it('шапка ведёт в атлас и в коллекции', async () => {
  render(<App />);

  const nav = screen.getByRole('navigation', { name: 'Разделы сайта' });

  fireEvent.click(screen.getByRole('button', { name: 'Атлас' }));
  await settle();
  expect(screen.getByTestId('atlas-region-card')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Коллекции' }));
  await settle();
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
it('шапка стоит и на экране ответа', async () => {
  render(<App />);

  expect(
    screen.getByRole('navigation', { name: 'Разделы сайта' }),
  ).toBeInTheDocument();

  startFindOnMap();
  await settle();

  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();
  expect(
    screen.getByRole('navigation', { name: 'Разделы сайта' }),
  ).toBeInTheDocument();
});

it('ведёт с главной на страницу коллекции и обратно в раздел', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Великая стена/ }));
  await settle();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Великая стена',
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Коллекции', current: false }),
  );
  await settle();
  expect(
    screen.getByRole('heading', {
      name: 'Места и явления, к которым привязаны вопросы',
    }),
  ).toBeInTheDocument();
});

it('коллекция запускает раунд ровно по своим регионам', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Великая стена/ }));
  await settle();
  fireEvent.click(screen.getByRole('button', { name: 'Спросить эти регионы' }));
  await settle();

  expect(screen.getByText(/Вопрос 1 из 9/)).toBeInTheDocument();
});

it('атлас держит выбор региона в состоянии приложения', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Исследовать карту/ }));
  await settle();
  /*
   * Выбирают на самой карте: списка-дублёра в атласе нет, а область несёт
   * `role="button"` и имя «регион, 汉字».
   */
  fireEvent.click(screen.getByRole('button', { name: 'Сычуань, 四川省' }));

  expect(screen.getByTestId('atlas-region-card')).toHaveTextContent('Сычуань');
});

/*
 * Выход из режима ведёт туда, откуда режим начинался, — на секцию «Режимы», а
 * не на верх главной: иначе после каждого раунда приходится прокручивать
 * страницу заново.
 */
it('карточка режима запускает раунд и возвращает на секцию «Режимы»', async () => {
  render(<App />);

  startFindOnMap();
  await settle();
  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Прервать раунд' }));

  expect(screen.getByRole('heading', { name: 'Режимы' })).toBeInTheDocument();
  expect(document.activeElement).toHaveAttribute('id', 'modes');
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
  /*
   * Подпись ищется текстовым запросом внутри кнопки, а не строением разметки:
   * цифра-подсказка (`kbd`) под запрос не подпадает, и тест не зависит от
   * того, каким узлом кнопка рисует подпись. `getByRole` с именем здесь не
   * годится по скорости: вычисление доступных имён всех кнопок на каждом из
   * 34 вопросов не укладывалось в лимит теста под нагрузкой полного набора.
   */
  const match = screen
    .getAllByTestId('choice-option')
    .find(
      (option) =>
        (within(option).queryByText(capitalOf(target)) !== null) === correct,
    )!;
  fireEvent.click(match);
}

/*
 * Кнопки «Далее» больше нет: и верный ответ, и ошибка переводят раунд к
 * следующему вопросу сами, по таймеру (спек RoundStage, 2026-08-17) — верный
 * через 500 мс, ошибка через 2000 мс, пока плашка показывает верный ответ.
 * Поэтому весь раунд проходится на поддельных часах.
 */
function finishRound(correct: boolean): void {
  vi.useFakeTimers();
  try {
    for (let index = 0; index < 34; index += 1) {
      answerCapital(correct);
      act(() => {
        vi.advanceTimersByTime(correct ? CORRECT_PAUSE_MS : WRONG_PAUSE_MS);
      });
    }
  } finally {
    vi.useRealTimers();
  }
}

async function startCapitalRound(): Promise<void> {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Регион — столица/ }));
  // Карточка спрашивает язык окном, и раунд начинается из него.
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));
  await settle();
}

it('показывает итог после раунда и возвращает на секцию «Режимы»', async () => {
  await startCapitalRound();
  finishRound(true);
  await settle();

  expect(screen.getByText('100%')).toBeInTheDocument();
  expect(screen.getByText('34 из 34')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'К режимам' }));

  expect(document.activeElement).toHaveAttribute('id', 'modes');
});

it('повторяет все ошибки, а не только показанные пять, и говорит об этом', async () => {
  await startCapitalRound();
  finishRound(false);
  await settle();

  expect(screen.getByText('0%')).toBeInTheDocument();

  // Подпись кнопки — то же число, что и длина раунда: экран показывает пять
  // тем, а повтор берёт все 34 ошибки.
  fireEvent.click(
    screen.getByRole('button', { name: 'Повторить ошибки: 34 региона' }),
  );
  await settle();

  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();
}, 20_000);

it('проходит раунд «регион — столица»', async () => {
  await startCapitalRound();

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
    /Династии и даты/,
    /Узнать по фотографии/,
  ]) {
    expect(screen.getByRole('button', { name })).toBeEnabled();
  }
});

it('запускает раунд по физической географии с главной', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Найти объект/ }));
  // Точное имя, а не «начинается с»: в герое стоит «Начать: найти на карте».
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));
  await settle();

  // Без выбора берётся первый набор — реки и формы, двенадцать целей.
  expect(screen.getByText(/Вопрос 1 из 16/)).toBeInTheDocument();
});

it('набор перед стартом задаёт длину физического раунда', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Найти объект/ }));
  fireEvent.click(screen.getByRole('radio', { name: /И озёра/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));
  await settle();

  expect(screen.getByText(/Вопрос 1 из 28/)).toBeInTheDocument();
});

/** В заполнении по-русски спрошенный регион назван в плашке `fill-target`. */
function askedFillRegion(): Region {
  const name = screen.getByTestId('fill-target').textContent;

  return regions.find((region) => region.nameRu === name)!;
}

function clickFillRegion(region: Region): void {
  const toggle = screen.getByRole('button', { name: 'Ответить из списка' });
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(toggle);
  }

  // У закрытого региона к имени приписан исход, поэтому имя ищется по началу.
  fireEvent.click(
    screen.getByRole('button', {
      name: new RegExp(`^${region.nameRu} \\(${region.nameZh}\\)`),
    }),
  );
}

/*
 * История идёт своим экраном и своими целями, но заканчивается общим итогом.
 * Проверяется именно стык: числа и склонение на итогах берутся из вида цели,
 * и «12 регионов» вместо «12 династий» было бы видно только здесь.
 */
it('раунд по истории доходит до итога и считает династии', async () => {
  render(<App />);

  fireEvent.click(
    screen.getByRole('button', { name: /Династии и даты/ }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));
  await settle();

  expect(screen.getByText(/Вопрос 1 из 12/)).toBeInTheDocument();

  vi.useFakeTimers();
  try {
    for (let index = 0; index < 12; index += 1) {
      fireEvent.click(screen.getAllByTestId('choice-option')[0]);
      act(() => {
        vi.advanceTimersByTime(CORRECT_PAUSE_MS + WRONG_PAUSE_MS);
      });
    }
  } finally {
    vi.useRealTimers();
  }
  await settle();

  expect(screen.getByText(/из 12/)).toBeInTheDocument();
  expect(document.body.textContent).toContain('династи');
  expect(document.body.textContent).not.toContain('12 регионов');
}, 20_000);

it('итог заполнения ведёт в раунд по ошибочным регионам', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Заполнить карту/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));
  await settle();

  vi.useFakeTimers();
  try {
    // Первый регион берётся со второй попытки: одна ошибка уходит в историю.
    const first = askedFillRegion();
    const wrong = regions.find((region) => region.id !== first.id)!;
    clickFillRegion(wrong);
    act(() => {
      vi.advanceTimersByTime(MISS_FLASH_MS);
    });
    clickFillRegion(first);

    for (let index = 1; index < 34; index += 1) {
      clickFillRegion(askedFillRegion());
    }
  } finally {
    vi.useRealTimers();
  }
  await settle();

  fireEvent.click(
    screen.getByRole('button', { name: 'Повторить ошибки: 1 регион' }),
  );
  await settle();

  expect(screen.getByText(/Вопрос 1 из 1/)).toBeInTheDocument();
}, 20_000);
