import { act, fireEvent, render, screen } from '@testing-library/react';
import { cityById } from '../../content/cities';
import { regions } from '../../content/regions';
import type { Region } from '../../content/types';
import type { QuestionLanguage } from '../../domain/question-language';
import type { ExerciseType } from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { ExerciseRound } from './ExerciseRound';

const SHORT_POOL = regions.slice(0, 3);

function renderRound(
  exerciseTypes: readonly ExerciseType[] = ['find-on-map'],
  language: QuestionLanguage = 'ru',
  onFinish = () => {},
  pool: readonly Region[] = regions,
) {
  return render(
    <ExerciseRound
      regions={pool}
      exerciseTypes={exerciseTypes}
      language={language}
      roundId="round-1"
      seed={1}
      onFinish={onFinish}
      onExit={() => {}}
    />,
  );
}

/** Список — в панели оболочки: перед ответом её нужно открыть. */
function openAnswerList() {
  const toggle = screen.getByRole('button', { name: 'Ответить из списка' });
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(toggle);
  }
}

/** Название административного центра региона: оно живёт в справочнике городов. */
function capitalOf(region: Region): string {
  return cityById(region.capitalCityId)!.nameRu;
}

function asked(): string {
  return screen.getByTestId('exercise-target').textContent ?? '';
}

function askedRegion(): Region {
  const label = asked();

  return regions.find((region) =>
    [region.nameRu, region.nameZh].includes(label),
  )!;
}

function answerCorrectly() {
  openAnswerList();
  const target = askedRegion();

  fireEvent.click(
    screen.getByRole('button', { name: `${target.nameRu} (${target.nameZh})` }),
  );
}

function answerWrongly() {
  openAnswerList();
  const target = askedRegion();
  const other = regions.find((region) => region.id !== target.id)!;

  fireEvent.click(
    screen.getByRole('button', { name: `${other.nameRu} (${other.nameZh})` }),
  );
}

it('переводит к следующему вопросу сам, без кнопки, после верного ответа', () => {
  vi.useFakeTimers();
  try {
    renderRound();
    const before = asked();

    answerCorrectly();

    expect(screen.queryByRole('button', { name: 'Далее' })).toBeNull();
    expect(screen.queryByText('Верно')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(asked()).not.toBe(before);
  } finally {
    vi.useRealTimers();
  }
});

it('после ошибки называет верный ответ и едет дальше сам', () => {
  vi.useFakeTimers();
  try {
    renderRound();
    const target = askedRegion();

    answerWrongly();

    expect(screen.getByText('Этот регион стоит повторить')).toBeTruthy();
    expect(asked()).toContain(target.nameRu);
    expect(screen.queryByRole('button', { name: 'Далее' })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Этот регион стоит повторить')).toBeNull();
    expect(asked()).not.toContain(target.nameRu);
  } finally {
    vi.useRealTimers();
  }
});

it('на русском спрашивает русским названием', () => {
  renderRound();

  expect(regions.map((region) => region.nameRu)).toContain(asked());
});

it('на китайском спрашивает иероглифами', () => {
  renderRound(['find-on-map'], 'zh');

  expect(regions.map((region) => region.nameZh)).toContain(asked());
});

it('в режиме «найти на карте» отвечают выбором области', () => {
  vi.useFakeTimers();
  try {
    renderRound();
    const before = asked();

    answerCorrectly();
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(asked()).not.toBe(before);
  } finally {
    vi.useRealTimers();
  }
});

it('в режиме «регион — столица» отвечают выбором варианта', () => {
  vi.useFakeTimers();
  try {
    renderRound(['match-pair']);
    const target = askedRegion();

    fireEvent.click(
      screen
        .getAllByTestId('choice-option')
        .find((option) => option.querySelector('span')?.textContent === capitalOf(target))!,
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(asked()).not.toBe(target.nameRu);
  } finally {
    vi.useRealTimers();
  }
});

it('меняет вид задания от вопроса к вопросу, когда типов несколько', () => {
  vi.useFakeTimers();
  try {
    renderRound(['find-on-map', 'match-pair']);

    expect(screen.queryAllByTestId('choice-option')).toHaveLength(0);

    answerCorrectly();
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
  } finally {
    vi.useRealTimers();
  }
});

it('заголовок вопроса помечен языком, когда спрашивают иероглифами', () => {
  renderRound(['find-on-map'], 'zh');

  expect(screen.getByTestId('exercise-target')).toHaveAttribute('lang', 'zh-Hans');
});

it('на русском заголовок вопроса языком не помечен', () => {
  renderRound();

  expect(screen.getByTestId('exercise-target')).not.toHaveAttribute('lang');
});

it('первый фокусируемый элемент — ответ, а не ссылка на лицензию', () => {
  const { container } = renderRound();

  const first = container.querySelector(
    'a[href], button:not([disabled]), [tabindex="0"]',
  );

  expect(first).toHaveAttribute('data-region-id');
});

it('«Прервать раунд» стоит в разметке после списка ответов', () => {
  renderRound();
  openAnswerList();

  const list = screen.getByRole('list', { name: 'Список регионов карты' });
  const abort = screen.getByRole('button', { name: 'Прервать раунд' });

  expect(
    list.compareDocumentPosition(abort) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

it('не печатает названия выносок: иначе Макао и Гонконг — готовые ответы', () => {
  const { container } = renderRound();

  const labels = [...container.querySelectorAll('.map-callout text')];

  expect(labels).not.toHaveLength(0);
  for (const label of labels) {
    expect((label as SVGElement).style.display, label.textContent ?? '').toBe(
      'none',
    );
  }
});

it('на экране темы выноски подписаны: там карту разглядывают, а не отвечают', () => {
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
    />,
  );

  const labels = [...container.querySelectorAll('.map-callout text')];

  expect(labels).not.toHaveLength(0);
  for (const label of labels) {
    expect((label as SVGElement).style.display).toBe('');
  }
});

it('сообщает о завершении раунда, не требуя нажатия на последнем вопросе', () => {
  vi.useFakeTimers();
  try {
    const finish = vi.fn();
    renderRound(['match-pair'], 'ru', finish, SHORT_POOL);

    for (let index = 0; index < SHORT_POOL.length; index += 1) {
      const target = askedRegion();
      fireEvent.click(
        screen
          .getAllByTestId('choice-option')
          .find((option) => option.querySelector('span')?.textContent === capitalOf(target))!,
      );
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }

    expect(finish).toHaveBeenCalledOnce();
  } finally {
    vi.useRealTimers();
  }
});
