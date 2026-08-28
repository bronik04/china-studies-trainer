import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { CORRECT_PAUSE_MS, WRONG_PAUSE_MS } from './round-pace';
import { expect, it, vi } from 'vitest';
import {
  physicalFeatures,
  physicalFeaturesUpTo,
} from '../../content/physical-features';
import { createSeededRandom } from '../../domain/random';
import { loadPhysicalMap } from '../../map/load-physical-map';
import { createRound, physicalTarget } from '../../domain/round';
import { PhysicalRound } from './PhysicalRound';

/*
 * Физический слой приезжает отдельным куском сборки, и карта берёт его
 * `import()`-ом. Загружается он здесь, один раз на файл: дальше карта
 * получает его прямо при монтировании, и проверки остаются синхронными — как
 * и в браузере, где кусок дотянут заранее.
 */
beforeAll(async () => {
  await loadPhysicalMap();
});

function renderRound(
  exerciseType: 'find-on-map' | 'name-target',
  features: readonly (typeof physicalFeatures)[number][] = physicalFeatures,
) {
  const onFinish = vi.fn();
  const onExit = vi.fn();

  const { container } = render(
    <PhysicalRound
      features={features}
      exerciseType={exerciseType}
      language="ru"
      roundId="r1"
      seed={11}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );

  return { container, onFinish, onExit };
}

/** Список — в панели оболочки: перед ответом её нужно открыть. */
function openAnswerList() {
  const toggle = screen.getByRole('button', { name: 'Ответить из списка' });
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(toggle);
  }
}

it('спрашивает тридцать четыре объекта подряд', () => {
  renderRound('find-on-map');

  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();
});

it('в «найти» вопрос называет объект, а карта его не подписывает', () => {
  const { container } = renderRound('find-on-map');

  expect(screen.getByTestId('exercise-target')).not.toHaveTextContent(
    'Объект на карте',
  );
  expect(container.querySelector('.physical-layer')).toHaveAttribute(
    'data-labels',
    'false',
  );

});

it('в «назвать» даёт четыре имени того же вида', () => {
  renderRound('name-target');

  const options = screen.getAllByTestId('choice-option');
  const kinds = options.map(
    (option) =>
      physicalFeatures.find((feature) => feature.id === option.dataset.choiceId)!
        .kind,
  );

  expect(options).toHaveLength(4);
  expect(new Set(kinds).size).toBe(1);
});

/*
 * Имя объекта есть и у формы на карте, и у кнопки равнозначного списка — это
 * два способа ответить на один вопрос, как у городов. Поэтому список
 * спрашивается отдельно, а не общим поиском по имени.
 */
function answerFromList(nameRu: string) {
  openAnswerList();
  const list = screen.getByRole('list', { name: 'Список объектов' });

  fireEvent.click(within(list).getByRole('button', { name: nameRu }));
}

it('верный ответ из списка ведёт к следующему вопросу', () => {
  vi.useFakeTimers();
  try {
    renderRound('find-on-map');

    const asked = screen.getByTestId('exercise-target').textContent!;

    answerFromList(asked);
    act(() => {
      vi.advanceTimersByTime(CORRECT_PAUSE_MS);
    });

    expect(screen.getByTestId('exercise-target').textContent).not.toBe(asked);
  } finally {
    vi.useRealTimers();
  }
});

it('после ошибки называет верный объект и едет дальше сам', () => {
  vi.useFakeTimers();
  try {
    renderRound('find-on-map');

    const asked = screen.getByTestId('exercise-target').textContent!;
    const target = physicalFeatures.find((feature) => feature.nameRu === asked)!;
    const wrong = physicalFeatures.find((feature) => feature.nameRu !== asked)!;

    answerFromList(wrong.nameRu);

    expect(screen.getByText('Этот объект стоит повторить')).toBeTruthy();
    const stated = screen.getByTestId('exercise-target').textContent!;
    expect(stated).toContain(target.nameRu);
    expect(stated).toContain(target.nameZh);
    expect(screen.queryByRole('button', { name: 'Далее' })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(WRONG_PAUSE_MS);
    });

    expect(screen.queryByText('Этот объект стоит повторить')).toBeNull();
    expect(screen.getByTestId('exercise-target').textContent).not.toContain(
      target.nameRu,
    );
  } finally {
    vi.useRealTimers();
  }
});

it('даёт прервать раунд', () => {
  const { onExit } = renderRound('name-target');

  fireEvent.click(screen.getByRole('button', { name: /Прервать раунд/ }));

  expect(onExit).toHaveBeenCalled();
});

it('сузившийся пул не сужает выбор: отвлекающие берутся из всех двенадцати', () => {
  // Так выглядит «Повторить ошибки» после двух промахов — по реке и по форме.
  // Своими же отвлекающими на вопросе про реку остался бы один вариант.
  const pool = physicalFeatures.filter(
    (feature) => feature.id === 'yangtze' || feature.id === 'gobi',
  );

  renderRound('name-target', pool);

  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
});

it('озеро отвлекают только озёрами: знак от заливки отличается видом', () => {
  renderRound(
    'name-target',
    physicalFeatures.filter((feature) => feature.kind === 'lake'),
  );

  const options = screen.getAllByTestId('choice-option');
  const kinds = options.map(
    (option) =>
      physicalFeatures.find((feature) => feature.id === option.dataset.choiceId)!
        .kind,
  );

  expect(options).toHaveLength(4);
  expect(new Set(kinds)).toEqual(new Set(['lake']));
});

it('на 320 px список отвечает за все тридцать четыре объекта', () => {
  renderRound('find-on-map', physicalFeaturesUpTo('all'));

  openAnswerList();
  const list = screen.getByRole('list', { name: 'Список объектов' });

  expect(within(list).getAllByRole('button')).toHaveLength(34);
});

it('каждый набор спрашивает свои цели ровно по разу', () => {
  for (const [set, length] of [
    ['base', 19],
    ['ranges', 26],
    ['all', 34],
  ] as const) {
    const pool = physicalFeaturesUpTo(set);
    const round = createRound(
      pool.map((feature) => physicalTarget(feature.id)),
      {
        roundId: 'r1',
        exerciseTypes: ['find-on-map'],
        language: 'ru',
        random: createSeededRandom(5),
      },
    );

    expect(round.questions, `набор ${set}`).toHaveLength(length);
    expect(new Set(round.questions.map((q) => q.target.id)).size).toBe(length);
  }
});
