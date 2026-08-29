import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LandmarkLayer } from './LandmarkLayer';
import { LANDMARK_POINTS } from './landmark-points';

function renderLayer(props: Partial<Parameters<typeof LandmarkLayer>[0]> = {}) {
  return render(
    <svg>
      <LandmarkLayer {...props} />
    </svg>,
  );
}

it('рисует звезду каждой достопримечательности вне гроздей', () => {
  const { container } = renderLayer({ points: LANDMARK_POINTS.slice(0, 1) });

  expect(container.querySelectorAll('.landmark-mark')).toHaveLength(1);
});

it('отдаёт нажатие своей достопримечательности', () => {
  const select = vi.fn();
  const point = LANDMARK_POINTS.find(
    (one) => one.landmark.id === 'potala',
  ) as (typeof LANDMARK_POINTS)[number];

  renderLayer({ points: [point], onSelect: select });

  fireEvent.click(
    screen.getByRole('button', { name: 'Дворец Потала, 布达拉宫' }),
  );

  expect(select).toHaveBeenCalledWith('potala');
});

/*
 * Три пекинских объекта стоят в полутора единицах карты друг от друга при цели
 * нажатия в семнадцать: без грозди они были бы одним пятном с тремя целями
 * поверх.
 */
it('собирает пекинские объекты в гроздь', () => {
  renderLayer({ onSelect: () => {} });

  expect(
    screen.getByRole('button', { name: /Гроздь из 3 достопримечательностей/ }),
  ).toBeInTheDocument();
});

it('раскрывает гроздь и отдаёт нажатие объекту внутри', () => {
  const select = vi.fn();
  renderLayer({ onSelect: select });

  fireEvent.click(
    screen.getByRole('button', { name: /Гроздь из 3 достопримечательностей/ }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Храм Неба, 天坛' }));

  expect(select).toHaveBeenCalledWith('temple-of-heaven');
});

/*
 * Слой без обработчика только показывает: ни ролей, ни остановок Tab. Иначе в
 * атласе появилось бы 38 узлов, которые ничего не делают.
 */
it('без обработчика не пускает звёзды в обход клавиатурой', () => {
  const { container } = renderLayer();

  expect(screen.queryAllByRole('button')).toHaveLength(0);

  for (const hit of container.querySelectorAll('.landmark-hit')) {
    expect(hit.getAttribute('tabindex')).toBe('-1');
    expect(hit.getAttribute('aria-hidden')).toBe('true');
  }
});

/* В «назвать» слой не интерактивен, и раскрыть гроздь руками нельзя. */
it('раскрывает гроздь со спрошенным объектом сама', () => {
  const { container } = renderLayer({ selectedLandmarkId: 'summer-palace' });

  const open = container.querySelector('.map-cluster[data-open="true"]');

  expect(open).not.toBeNull();
  expect(
    open?.querySelector('.landmark[data-landmark-id="summer-palace"]'),
  ).not.toBeNull();
});
