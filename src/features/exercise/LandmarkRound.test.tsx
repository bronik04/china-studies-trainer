import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CORRECT_PAUSE_MS } from './round-pace';
import { landmarksUpTo } from '../../content/landmark-sets';
import { LandmarkRound, type LandmarkRoundProps } from './LandmarkRound';

function renderRound(overrides: Partial<LandmarkRoundProps> = {}) {
  return render(
    <LandmarkRound
      landmarks={landmarksUpTo('monuments')}
      exerciseType="find-on-map"
      language="ru"
      roundId="test"
      seed={1}
      onFinish={() => {}}
      onExit={() => {}}
      {...overrides}
    />,
  );
}

function askedName(): string {
  return screen.getByTestId('exercise-target').textContent as string;
}

/*
 * Ответ по звезде: если объект попал в гроздь, её сначала раскрывают. Так же
 * отвечает и ученик — прямой цели у скучившихся объектов нет, пока лупа
 * закрыта.
 */
function answerOnMap(name: string) {
  const own = new RegExp(`^${name},`);

  if (screen.queryByRole('button', { name: own }) === null) {
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`Гроздь из .* ${name}`),
      }),
    );
  }

  fireEvent.click(screen.getByRole('button', { name: own }));
}

it('засчитывает верную звезду и идёт к следующему вопросу', () => {
  vi.useFakeTimers();
  try {
    renderRound();

    const asked = askedName();
    answerOnMap(asked);
    act(() => {
      vi.advanceTimersByTime(CORRECT_PAUSE_MS);
    });

    expect(askedName()).not.toBe(asked);
  } finally {
    vi.useRealTimers();
  }
});

/*
 * Нажатие по свёрнутой грозди — раскрытие, а не попытка: иначе ученик терял бы
 * ответ на том, что три пекинских объекта не помещаются в один пиксель.
 */
it('не считает попыткой нажатие по грозди', () => {
  const finish = vi.fn();
  renderRound({ onFinish: finish });

  const before = screen.getByText(/Вопрос 1 из/);
  fireEvent.click(
    screen.getByRole('button', { name: /Гроздь из 3 достопримечательностей: Запретный город/ }),
  );

  expect(before).toBeInTheDocument();
  expect(finish).not.toHaveBeenCalled();
});

/* Карта в раундах по достопримечательностям чистая: решение владельца. */
it('не показывает городов и физической карты', () => {
  const { container } = renderRound();

  expect(container.querySelector('.city-layer')).toBeNull();
  expect(container.querySelector('.physical-layer')).toBeNull();
  expect(container.querySelector('.landmark-layer')).not.toBeNull();
});

it('в «назвать» прячет звёзды от подписей и даёт четыре имени', () => {
  const { container } = renderRound({ exerciseType: 'name-target' });

  expect(
    container.querySelector('.landmark-layer')?.getAttribute('data-labels'),
  ).toBe('false');
  expect(screen.getAllByRole('button', { name: /./ }).length).toBeGreaterThan(3);
});

/* В «достопримечательность — регион» звёзд нет вовсе: они и есть ответ. */
it('в «объект — регион» прячет звёзды вовсе', () => {
  const { container } = renderRound({ exerciseType: 'match-pair' });

  expect(container.querySelector('.landmark-layer')).toBeNull();
});
