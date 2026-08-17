import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { citiesUpTo } from '../../content/cities';
import { regions } from '../../content/regions';
import type { City } from '../../content/types';
import type { ExerciseType } from '../../domain/round';
import { CityRound } from './CityRound';

const capitals = citiesUpTo('capital');
const shortPool = capitals.slice(0, 3);

function renderRound(
  exerciseType: ExerciseType = 'find-on-map',
  cities: readonly City[] = capitals,
  onFinish = () => {},
) {
  return render(
    <CityRound
      cities={cities}
      exerciseType={exerciseType}
      language="ru"
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

function asked(): string {
  return screen.getByTestId('exercise-target').textContent ?? '';
}

function askedCity(): City {
  return capitals.find((city) => city.nameRu === asked())!;
}

it('спрашивает город по имени и принимает ответ из равнозначного списка', () => {
  vi.useFakeTimers();
  try {
    renderRound();
    const before = asked();
    openAnswerList();
    const list = screen.getByRole('list', { name: 'Список городов' });

    fireEvent.click(within(list).getByRole('button', { name: askedCity().nameRu }));
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(asked()).not.toBe(before);
  } finally {
    vi.useRealTimers();
  }
});

it('в «найти город» отвечают и нажатием по точке', () => {
  vi.useFakeTimers();
  try {
    const { container } = renderRound();
    const before = asked();

    fireEvent.click(
      container.querySelector(`.city[data-city-id="${askedCity().id}"] .city-hit`)!,
    );
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
    const target = askedCity();
    const other = capitals.find((city) => city.id !== target.id)!;

    openAnswerList();
    const list = screen.getByRole('list', { name: 'Список городов' });
    fireEvent.click(within(list).getByRole('button', { name: other.nameRu }));

    expect(screen.getByText('Этот город стоит повторить')).toBeTruthy();
    expect(asked()).toContain(target.nameRu);
    expect(asked()).toContain(target.nameZh);
    expect(screen.queryByRole('button', { name: 'Далее' })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Этот город стоит повторить')).toBeNull();
    expect(asked()).not.toContain(target.nameRu);
  } finally {
    vi.useRealTimers();
  }
});

it('в «назвать город» показывает четыре имени и подсвечивает спрошенную точку', () => {
  const { container } = renderRound('name-target');

  expect(asked()).toBe('Город на карте');
  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
  expect(container.querySelectorAll('.city[data-selected="true"]')).toHaveLength(1);
});

/*
 * Точка города в «город — регион» и есть ответ: показать её значит спросить
 * «где Чэнду» и тут же поставить туда кружок.
 */
it('в «город — регион» прячет точки и отвечают нажатием по области', () => {
  vi.useFakeTimers();
  try {
    const { container } = renderRound('match-pair');
    const before = asked();
    const target = askedCity();

    expect(container.querySelector('.city-layer')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(regionNameOf(target.regionId)) }),
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(asked()).not.toBe(before);
  } finally {
    vi.useRealTimers();
  }
});

it('сообщает о завершении раунда', () => {
  vi.useFakeTimers();
  try {
    const finish = vi.fn();
    renderRound('find-on-map', shortPool, finish);

    for (let index = 0; index < shortPool.length; index += 1) {
      const target = shortPool.find((city) => city.nameRu === asked())!;
      openAnswerList();
      const list = screen.getByRole('list', { name: 'Список городов' });
      fireEvent.click(within(list).getByRole('button', { name: target.nameRu }));
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }

    expect(finish).toHaveBeenCalledOnce();
  } finally {
    vi.useRealTimers();
  }
});

function regionNameOf(regionId: string): string {
  return regions.find((region) => region.id === regionId)!.nameRu;
}


/*
 * В «найти город» подпись выдавала бы ответ наведением курсора — точку
 * достаточно было бы обвести мышью.
 */
it.each(['find-on-map', 'name-target'] as const)(
  'в игре %s не подписывает города на карте',
  (exerciseType) => {
    const { container } = renderRound(exerciseType);

    expect(container.querySelector('.city-layer')?.getAttribute('data-labels')).toBe(
      'false',
    );
  },
);
