import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import type { Region } from '../../content/types';
import type { ExerciseType, Level } from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { ExerciseRound } from './ExerciseRound';

const SHORT_POOL = regions.slice(0, 3);

function renderRound(
  exerciseTypes: readonly ExerciseType[] = ['find-on-map'],
  level: Level = 1,
  onFinish = () => {},
  pool: readonly Region[] = regions,
) {
  return render(
    <ExerciseRound
      regions={pool}
      exerciseTypes={exerciseTypes}
      level={level}
      roundId="round-1"
      seed={1}
      onFinish={onFinish}
      onExit={() => {}}
    />,
  );
}

function asked(): string {
  return screen.getByTestId('exercise-target').textContent ?? '';
}

function askedRegion(): Region {
  const label = asked();

  return regions.find((region) =>
    [region.nameRu, region.nameZh, region.pinyin, region.capitalRu].includes(label),
  )!;
}

it('на первом уровне спрашивает русским названием', () => {
  renderRound();

  expect(regions.map((region) => region.nameRu)).toContain(asked());
});

it('на втором уровне спрашивает китайским названием', () => {
  renderRound(['find-on-map'], 2);

  expect(regions.map((region) => region.nameZh)).toContain(asked());
});

it('показывает уровень в прогрессе', () => {
  renderRound(['find-on-map'], 2);

  expect(screen.getByText(/уровень 2/)).toBeInTheDocument();
});

it('в режиме «найти на карте» отвечают выбором области', () => {
  renderRound();
  const target = askedRegion();

  fireEvent.click(
    screen.getByRole('button', { name: `${target.nameRu} (${target.nameZh})` }),
  );

  expect(screen.getByRole('heading', { name: 'Верно' })).toBeInTheDocument();
});

it('в режиме «регион — столица» отвечают выбором варианта', () => {
  renderRound(['match-capital']);
  const target = askedRegion();

  fireEvent.click(
    screen
      .getAllByTestId('choice-option')
      .find((option) => option.textContent === target.capitalRu)!,
  );

  expect(screen.getByRole('heading', { name: 'Верно' })).toBeInTheDocument();
});

it('в смешанном раунде меняет вид задания от вопроса к вопросу', () => {
  renderRound(['find-on-map', 'match-capital'], 4);

  expect(screen.queryAllByTestId('choice-option')).toHaveLength(0);

  const target = askedRegion();
  fireEvent.click(
    screen.getByRole('button', { name: `${target.nameRu} (${target.nameZh})` }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));

  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
});

it('заголовок вопроса помечен языком, когда спрашивают иероглифами', () => {
  renderRound(['find-on-map'], 2);

  expect(screen.getByTestId('exercise-target')).toHaveAttribute('lang', 'zh-Hans');
});

it('на первом уровне заголовок вопроса языком не помечен', () => {
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

  const list = screen.getByRole('list', { name: 'Список регионов карты' });
  const abort = screen.getByRole('button', { name: 'Прервать раунд' });

  expect(
    list.compareDocumentPosition(abort) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

it('карточка ответа стоит в разметке до карты', () => {
  const { container } = renderRound();
  const target = askedRegion();

  fireEvent.click(
    screen.getByRole('button', { name: `${target.nameRu} (${target.nameZh})` }),
  );

  const feedback = container.querySelector('.answer-feedback')!;
  const map = container.querySelector('.china-map')!;

  expect(
    feedback.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

it('без карты макет схлопывается в одну колонку и не печатает атрибуцию', () => {
  const { container } = renderRound(['match-capital']);

  expect(container.querySelector('.china-map')).toBeNull();
  expect(container.querySelector('.round-layout')).toHaveAttribute(
    'data-columns',
    'one',
  );
  expect(screen.queryByRole('link', { name: 'CC BY 4.0' })).toBeNull();
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

it('сообщает о завершении раунда', () => {
  const finish = vi.fn();
  renderRound(['match-capital'], 1, finish, SHORT_POOL);

  for (let index = 0; index < SHORT_POOL.length; index += 1) {
    const target = askedRegion();
    fireEvent.click(
      screen
        .getAllByTestId('choice-option')
        .find((option) => option.textContent === target.capitalRu)!,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: index === SHORT_POOL.length - 1 ? 'Завершить раунд' : 'Далее',
      }),
    );
  }

  expect(finish).toHaveBeenCalledOnce();
});
