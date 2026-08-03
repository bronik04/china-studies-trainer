import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import type { Region } from '../../content/types';
import { ChoiceExercise } from './ChoiceExercise';
import { EXERCISE_MODES } from './exercise-modes';

const SHORT_POOL = regions.slice(0, 3);

function renderExercise(
  mode = EXERCISE_MODES['match-capital'],
  onFinish = () => {},
  pool: readonly Region[] = regions,
) {
  render(
    <ChoiceExercise
      regions={pool}
      mode={mode}
      roundId="round-1"
      seed={1}
      onFinish={onFinish}
      onExit={() => {}}
    />,
  );
}

function options(): HTMLElement[] {
  return screen.getAllByTestId('choice-option');
}

function askedRegion(): Region {
  const asked = screen.getByTestId('exercise-target').textContent;

  return regions.find((region) => region.nameRu === asked)!;
}

it('показывает прогресс и четыре варианта', () => {
  renderExercise();

  expect(screen.getByText('Вопрос 1 из 34')).toBeInTheDocument();
  expect(options()).toHaveLength(4);
});

it('среди вариантов есть правильная столица ровно один раз', () => {
  renderExercise();
  const target = askedRegion();

  const matching = options().filter(
    (option) => option.textContent === target.capitalRu,
  );

  expect(matching).toHaveLength(1);
});

it('подтверждает верный ответ', () => {
  renderExercise();
  const target = askedRegion();

  fireEvent.click(options().find((option) => option.textContent === target.capitalRu)!);

  expect(screen.getByRole('heading', { name: 'Верно' })).toBeInTheDocument();
});

it('показывает правильный ответ после ошибки', () => {
  renderExercise();
  const target = askedRegion();

  fireEvent.click(options().find((option) => option.textContent !== target.capitalRu)!);

  expect(
    screen.getByRole('heading', { name: 'Этот регион стоит повторить' }),
  ).toBeInTheDocument();
});

it('не принимает второй ответ на тот же вопрос', () => {
  renderExercise();
  const target = askedRegion();

  fireEvent.click(options().find((option) => option.textContent === target.capitalRu)!);

  expect(options().every((option) => option.hasAttribute('disabled'))).toBe(true);
});

it('в режиме «назови регион» подсвечивает область на карте', () => {
  renderExercise(EXERCISE_MODES['name-region']);
  const asked = screen.getByTestId('exercise-target').textContent;

  expect(asked).toBe('Регион на карте');
  expect(document.querySelectorAll('[data-selected="true"]')).toHaveLength(1);
});

it('сообщает о завершении раунда', () => {
  const finish = vi.fn();
  renderExercise(EXERCISE_MODES['match-capital'], finish, SHORT_POOL);

  for (let index = 0; index < SHORT_POOL.length; index += 1) {
    const asked = screen.getByTestId('exercise-target').textContent;
    const target = regions.find((region) => region.nameRu === asked)!;
    fireEvent.click(
      options().find((option) => option.textContent === target.capitalRu)!,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: index === SHORT_POOL.length - 1 ? 'Завершить раунд' : 'Далее',
      }),
    );
  }

  expect(finish).toHaveBeenCalledOnce();
});
