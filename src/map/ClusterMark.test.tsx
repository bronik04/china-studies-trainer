import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ClusterMark } from './ClusterMark';

const cluster = {
  id: 'cluster:a',
  x: 100,
  y: 100,
  scale: 3,
  members: [
    { id: 'a', x: 98, y: 100 },
    { id: 'b', x: 102, y: 100 },
  ],
} as const;

function renderMark(
  props: Partial<Parameters<typeof ClusterMark>[0]> = {},
) {
  return render(
    <svg>
      <ClusterMark
        cluster={cluster}
        hitRadius={8.6}
        selected={false}
        mark={<circle className="city-mark" cx={100} cy={100} r={3.2} />}
        {...props}
      />
    </svg>,
  );
}

it('показывает число объектов грозди', () => {
  const { container } = renderMark();

  expect(container.querySelector('.cluster-count')?.textContent).toBe('2');
});

/*
 * Без подписи гроздь — украшение: ни роли, ни фокуса, ни нажатия. То же
 * правило, что у городов: разметка называет цель ровно тогда, когда в неё
 * можно попасть.
 */
it('без подписи не берёт ни роли, ни фокуса', () => {
  const { container } = renderMark();

  expect(screen.queryByRole('button')).toBeNull();
  expect(
    container.querySelector('.cluster-hit')?.getAttribute('tabindex'),
  ).toBe('-1');
});

it('с подписью отвечает на нажатие и на клавиши', () => {
  const activate = vi.fn();
  renderMark({ label: 'Города рядом', onActivate: activate });

  const hit = screen.getByRole('button', { name: 'Города рядом' });
  fireEvent.click(hit);
  fireEvent.keyDown(hit, { key: 'Enter' });

  expect(activate).toHaveBeenCalledTimes(2);
});

/* Спрошенная цель внутри видна признаком на самой грозди. */
it('несёт признак спрошенной цели', () => {
  const { container } = renderMark({ selected: true });

  expect(
    container.querySelector('.map-cluster')?.getAttribute('data-selected'),
  ).toBe('true');
});
