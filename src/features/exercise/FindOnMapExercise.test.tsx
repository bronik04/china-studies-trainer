import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import type { Region } from '../../content/types';
import { FindOnMapExercise } from './FindOnMapExercise';

/** Проверка завершения раунда не зависит от его длины, а полный набор в ней слишком медленный. */
const SHORT_POOL = regions.slice(0, 3);

function renderExercise(onFinish = () => {}, pool: readonly Region[] = regions) {
  render(
    <FindOnMapExercise
      regions={pool}
      roundId="round-1"
      seed={1}
      onFinish={onFinish}
      onExit={() => {}}
    />,
  );
}

function askedRegionName(): string {
  return screen.getByTestId('exercise-target').textContent ?? '';
}

function answer(correct: boolean, pool: readonly Region[] = regions): void {
  const asked = askedRegionName();
  const target = pool.find((region) => region.nameRu === asked)!;
  const chosen = correct ? target : pool.find((region) => region.id !== target.id)!;

  fireEvent.click(
    screen.getByRole('button', { name: `${chosen.nameRu} (${chosen.nameZh})` }),
  );
}

it('показывает прогресс по всем регионам', () => {
  renderExercise();

  expect(screen.getByText('Вопрос 1 из 34')).toBeInTheDocument();
});

it('называет искомый регион', () => {
  renderExercise();

  expect(regions.map((region) => region.nameRu)).toContain(askedRegionName());
});

it('подтверждает верный ответ', () => {
  renderExercise();

  answer(true);

  expect(screen.getByRole('heading', { name: 'Верно' })).toBeInTheDocument();
});

it('показывает правильный ответ после ошибки', () => {
  renderExercise();
  const asked = askedRegionName();

  answer(false);

  expect(
    screen.getByRole('heading', { name: 'Этот регион стоит повторить' }),
  ).toBeInTheDocument();
  expect(screen.getByText(new RegExp(`Правильный ответ: ${asked}`))).toBeInTheDocument();
});

it('не принимает второй ответ на тот же вопрос', () => {
  renderExercise();

  answer(true);

  expect(screen.getByText('Вопрос 1 из 34')).toBeInTheDocument();
});

it('переходит ко второму вопросу', () => {
  renderExercise();

  answer(true);
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));

  expect(screen.getByText('Вопрос 2 из 34')).toBeInTheDocument();
});

it('сообщает о завершении раунда после последнего вопроса', () => {
  const finish = vi.fn();
  renderExercise(finish, SHORT_POOL);

  for (let index = 0; index < SHORT_POOL.length; index += 1) {
    const isLast = index === SHORT_POOL.length - 1;
    answer(true, SHORT_POOL);
    expect(finish).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: isLast ? 'Завершить раунд' : 'Далее' }),
    );
  }

  expect(finish).toHaveBeenCalledOnce();
});
