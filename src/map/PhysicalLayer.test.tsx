import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhysicalLayer } from './PhysicalLayer';

function renderLayer(props: Parameters<typeof PhysicalLayer>[0] = {}) {
  return render(
    <svg viewBox="-16 -16 806 601">
      <PhysicalLayer {...props} />
    </svg>,
  );
}

describe('PhysicalLayer', () => {
  it('рисует все формы подложки и все реки', () => {
    const { container } = renderLayer();

    expect(container.querySelectorAll('.relief-shape')).toHaveLength(38);
    expect(container.querySelectorAll('.river-line')).toHaveLength(6);
  });

  it('формы фона недоступны читалке экрана, а реки названы', () => {
    const { container } = renderLayer();

    for (const shape of container.querySelectorAll('.relief-shape')) {
      expect(shape).toHaveAttribute('aria-hidden', 'true');
    }
    expect(screen.getByLabelText(/Янцзы, 长江/)).toBeInTheDocument();
  });

  it('без обработчика реки не получают фокус: слой только показывает', () => {
    const { container } = renderLayer();

    for (const line of container.querySelectorAll('.river-line')) {
      expect(line).toHaveAttribute('tabindex', '-1');
    }
  });

  it('с обработчиком река отвечает на Enter', () => {
    const onSelect = vi.fn();
    renderLayer({ onSelect });

    const river = screen.getByLabelText(/Хуанхэ/);
    river.focus();
    fireEvent.keyDown(river, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('yellow-river');
  });

  it('подписи скрываются по требованию: в игре имя объекта и есть ответ', () => {
    const { container } = renderLayer({ showsLabels: false });

    expect(container.querySelector('.physical-layer')).toHaveAttribute(
      'data-labels',
      'false',
    );
  });
});
