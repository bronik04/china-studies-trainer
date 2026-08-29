import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { expect, it } from 'vitest';
import { ClusterLens } from './ClusterLens';
import type { MapCluster } from './cluster';

const cluster: MapCluster = {
  id: 'cluster:a',
  x: 100,
  y: 100,
  radius: 40,
  scale: 8,
  members: [
    { id: 'a', x: 100, y: 99, lensX: 100, lensY: 92 },
    { id: 'b', x: 100, y: 101, lensX: 100, lensY: 108 },
  ],
};

const LABEL = 'Гроздь из двух городов: a, b';

function Harness({ label }: { readonly label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <svg>
      <ClusterLens
        cluster={cluster}
        open={open}
        label={label}
        hitRadius={8.64}
        mark={
          <circle className="test-mark" cx={cluster.x} cy={cluster.y} r={3} />
        }
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
      >
        {cluster.members.map((member) => (
          <circle
            key={member.id}
            data-cluster-member={member.id}
            cx={member.lensX}
            cy={member.lensY}
            r={4}
            role="button"
            aria-label={member.id}
            tabIndex={0}
          />
        ))}
      </ClusterLens>
    </svg>
  );
}

it('свёрнутая гроздь называет число объектов', () => {
  render(<Harness label={LABEL} />);

  expect(screen.getByRole('button', { name: LABEL })).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
});

it('раскрывается по Enter и уводит фокус внутрь', () => {
  render(<Harness label={LABEL} />);

  fireEvent.keyDown(screen.getByRole('button', { name: LABEL }), {
    key: 'Enter',
  });

  expect(screen.getByRole('button', { name: 'a' })).toHaveFocus();
});

it('раскрывается нажатием', () => {
  render(<Harness label={LABEL} />);

  fireEvent.click(screen.getByRole('button', { name: LABEL }));

  expect(screen.getByRole('button', { name: 'b' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: LABEL })).not.toBeInTheDocument();
});

it('сворачивается по Esc и возвращает фокус на гроздь', () => {
  render(<Harness label={LABEL} />);

  fireEvent.keyDown(screen.getByRole('button', { name: LABEL }), {
    key: 'Enter',
  });
  fireEvent.keyDown(screen.getByRole('button', { name: 'a' }), {
    key: 'Escape',
  });

  expect(screen.getByRole('button', { name: LABEL })).toHaveFocus();
});

/*
 * Слой без нажатия — атлас и «назвать»: гроздь там показывает, а не отвечает.
 * Остановки Tab у неё быть не должно, иначе на карте появятся десятки узлов,
 * которые ничего не делают.
 */
it('не отвечает и не берёт фокус без подписи', () => {
  const { container } = render(<Harness />);

  expect(screen.queryByRole('button')).not.toBeInTheDocument();

  const hit = container.querySelector('.cluster-hit') as SVGCircleElement;

  expect(hit.getAttribute('tabindex')).toBe('-1');
  expect(hit.getAttribute('aria-hidden')).toBe('true');
});
