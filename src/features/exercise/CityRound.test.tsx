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

it('на ошибке называет и город, и его регион', () => {
  renderRound();
  const target = askedCity();
  const other = capitals.find((city) => city.id !== target.id)!;
  const list = screen.getByRole('list', { name: 'Список городов' });

  fireEvent.click(within(list).getByRole('button', { name: other.nameRu }));

  const feedback = screen.getByText('Этот город стоит повторить').closest('section')!;

  expect(within(feedback).getByText(new RegExp(target.nameRu))).toBeTruthy();
  expect(
    within(feedback).getByText(new RegExp(regionNameOf(target.regionId))),
  ).toBeTruthy();
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
 * Та же утечка, что у выносок Макао и Гонконга: подпись подсвеченной точки —
 * готовый ответ.
 */
it('в «назвать город» не подписывает подсвеченную точку', () => {
  const { container } = renderRound('name-target');

  expect(container.querySelector('.city-layer')?.getAttribute('data-labels')).toBe(
    'false',
  );
});
