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

  it('декоративные формы недоступны читалке экрана, а цели названы', () => {
    const { container } = renderLayer();

    const decorative = container.querySelectorAll(
      '.relief-shape:not([data-feature-id])',
    );
    const targets = container.querySelectorAll('.relief-shape[data-feature-id]');

    expect(decorative).toHaveLength(32);
    expect(targets).toHaveLength(6);
    for (const shape of decorative) {
      expect(shape).toHaveAttribute('aria-hidden', 'true');
    }
    expect(screen.getByLabelText(/Тибетское нагорье, 青藏高原/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Янцзы, 长江/)).toBeInTheDocument();
  });

  it('без обработчика ни одна цель не получает фокус: слой только показывает', () => {
    const { container } = renderLayer();

    for (const node of container.querySelectorAll(
      '.river-line, .relief-shape[data-feature-id]',
    )) {
      expect(node).toHaveAttribute('tabindex', '-1');
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

  it('с обработчиком форма отвечает на Enter и на Space', () => {
    const onSelect = vi.fn();
    renderLayer({ onSelect });

    const shape = screen.getByLabelText(/Гоби/);
    fireEvent.keyDown(shape, { key: 'Enter' });
    fireEvent.keyDown(shape, { key: ' ' });

    expect(onSelect).toHaveBeenNthCalledWith(1, 'gobi');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'gobi');
  });

  it('подпись есть у каждой из двенадцати целей и ни у одной декоративной', () => {
    const { container } = renderLayer();

    expect(container.querySelectorAll('.physical-label')).toHaveLength(12);
  });

  it('подпись помечена как видная только у выбранного объекта', () => {
    const { container } = renderLayer({ selectedFeatureId: 'gobi' });

    expect(
      container.querySelector('.physical-label[data-feature-id="gobi"]'),
    ).toHaveAttribute('data-selected', 'true');
    expect(
      container.querySelector('.physical-label[data-feature-id="yangtze"]'),
    ).toHaveAttribute('data-selected', 'false');
  });

  it('подписи не обрезаются границей страны: имя длиннее самой равнины', () => {
    const { container } = renderLayer();

    expect(container.querySelector('.physical-labels')).not.toHaveAttribute(
      'clip-path',
    );
  });

  it('границы регионов рисуются поверх ступеней', () => {
    const { container } = renderLayer();

    expect(container.querySelectorAll('.region-outlines use')).toHaveLength(34);
  });

  it('фокус показывает подпись и у формы, и у реки', () => {
    const { container } = renderLayer({ onSelect: vi.fn() });
    const shown = () =>
      [...container.querySelectorAll('.physical-label[data-hovered="true"]')].map(
        (label) => (label as HTMLElement).dataset.featureId,
      );

    fireEvent.focus(screen.getByLabelText(/Янцзы/));
    expect(shown()).toEqual(['yangtze']);

    fireEvent.focus(screen.getByLabelText(/Гоби/));
    expect(shown()).toEqual(['gobi']);
  });

  it('узел под указателем важнее реки, посчитанной картой', () => {
    // Указатель ушёл с реки на форму: карта о том не узнает — события React не
    // всплывают из портала, — и без верного порядка имя реки залипало бы.
    const { container } = renderLayer({
      onSelect: vi.fn(),
      hoveredFeatureId: 'yellow-river',
    });

    fireEvent.pointerEnter(
      container.querySelector('.relief-shape[data-feature-id="loess-plateau"]')!,
    );

    expect(
      container.querySelector('.physical-label[data-feature-id="loess-plateau"]'),
    ).toHaveAttribute('data-hovered', 'true');
    expect(
      container.querySelector('.river-line[data-feature-id="yellow-river"]'),
    ).toHaveAttribute('data-hovered', 'false');
  });

  it('исход ответа помечает и форму, и реку', () => {
    const { container } = renderLayer({
      featureOutcomes: { gobi: 'incorrect', yangtze: 'correct' },
    });

    expect(
      container.querySelector('.relief-shape[data-feature-id="gobi"]'),
    ).toHaveAttribute('data-outcome', 'incorrect');
    expect(
      container.querySelector('.river-line[data-feature-id="yangtze"]'),
    ).toHaveAttribute('data-outcome', 'correct');
    // Копия контура под штриховку: у самой формы заливка остаётся ступенью.
    expect(container.querySelectorAll('.relief-outcome')).toHaveLength(1);
  });

  it('без исходов признака нет ни у кого', () => {
    const { container } = renderLayer();

    expect(container.querySelector('[data-outcome]')).toBeNull();
  });

  it('подписи скрываются по требованию: в игре имя объекта и есть ответ', () => {
    const { container } = renderLayer({ showsLabels: false });

    expect(container.querySelector('.physical-layer')).toHaveAttribute(
      'data-labels',
      'false',
    );
  });
});
