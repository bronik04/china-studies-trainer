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

  it('рисует полосы высот снизу вверх', () => {
    const { container } = renderLayer();

    const bands = [...container.querySelectorAll('[data-band]')];

    expect(bands.map((band) => band.getAttribute('data-band'))).toEqual([
      '0',
      '200',
      '500',
      '1000',
      '2000',
      '3000',
      '4000',
    ]);
  });

  /*
   * Полосы декоративны: шкалу называет легенда словами, а семь узлов в обходе
   * по Tab не дали бы ученику ничего.
   */
  it('не даёт полосам имени и фокуса', () => {
    const { container } = renderLayer();

    for (const band of container.querySelectorAll('[data-band]')) {
      expect(band.getAttribute('aria-hidden')).toBe('true');
      expect(band.getAttribute('tabindex')).toBeNull();
    }
  });

  /*
   * Форма перестала заливать фон: заливка занята шкалой. Цель у неё остаётся —
   * имя, роль и фокус нужны игре «Найти на физической карте».
   */
  it('оставляет спрашиваемой форме имя и роль без заливки по ступени', () => {
    const { container } = renderLayer({ onSelect: () => {} });

    const shape = container.querySelector('.relief-shape[data-feature-id]');

    expect(shape).not.toBeNull();
    expect(shape?.getAttribute('role')).toBe('button');
    expect(shape?.getAttribute('data-step')).toBeNull();
    expect(shape?.getAttribute('aria-label')).toMatch(/,/);
  });

  it('декоративные формы недоступны читалке экрана, а цели названы', () => {
    const { container } = renderLayer();

    const decorative = container.querySelectorAll(
      '.relief-shape:not([data-feature-id])',
    );
    const targets = container.querySelectorAll('.relief-shape[data-feature-id]');

    expect(decorative).toHaveLength(22);
    expect(targets).toHaveLength(16);
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

  it('подпись есть у каждой цели и ни у одной декоративной формы', () => {
    const { container } = renderLayer();

    expect(container.querySelectorAll('.physical-label')).toHaveLength(28);
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

  it('узел в фокусе важнее объекта, посчитанного картой', () => {
    // При обходе с клавиатуры указатель стоит там, где его оставили, и имя,
    // посчитанное картой по его координатам, закрывало бы имя объекта в
    // фокусе. Указателя у узлов слоя нет вовсе — его считает карта.
    const { container } = renderLayer({
      onSelect: vi.fn(),
      hoveredFeatureId: 'yellow-river',
    });

    fireEvent.focus(
      container.querySelector('.relief-shape[data-feature-id="loess-plateau"]')!,
    );

    expect(
      container.querySelector('.physical-label[data-feature-id="loess-plateau"]'),
    ).toHaveAttribute('data-hovered', 'true');
    expect(
      container.querySelector('.river-line[data-feature-id="yellow-river"]'),
    ).toHaveAttribute('data-hovered', 'false');
  });

  it('рисует контур и знак каждого озера', () => {
    const { container } = renderLayer();

    expect(container.querySelectorAll('.lake-shape')).toHaveLength(6);
    expect(container.querySelectorAll('.lake-mark')).toHaveLength(6);
  });

  it('озеро названо читалке экрана и отвечает на Enter', () => {
    const onSelect = vi.fn();
    renderLayer({ onSelect });

    const lake = screen.getByLabelText(/Поянху, 鄱阳湖/);
    fireEvent.keyDown(lake, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('poyang');
  });

  it('исход у озера помечается кольцом, а не штриховкой', () => {
    const { container } = renderLayer({ featureOutcomes: { taihu: 'incorrect' } });

    expect(
      container.querySelector('.lake-halo[data-feature-id="taihu"]'),
    ).toHaveAttribute('data-outcome', 'incorrect');
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

  /*
   * Обрезка `clipPath` строит область по каждой вершине и на 148 КБ контуров
   * стоит 6 секунд блокировки при первом показе слоя; маска растрирует те же
   * контуры один раз и стоит миллисекунду. Геометрия та же — те же `<use>` на
   * те же 34 области.
   */
  it('прячет сушу маской, а не обрезкой', () => {
    const { container } = renderLayer();

    expect(container.querySelector('#china-land-mask')).not.toBeNull();
    expect(container.querySelector('clipPath')).toBeNull();
    expect(container.querySelectorAll('[clip-path]')).toHaveLength(0);
  });

  /*
   * Рамка маски задаётся явно: по умолчанию она считается от габарита
   * закрашиваемой группы, и группа, чей габарит виден целиком, обрезалась бы
   * собственной маской.
   */
  it('задаёт маске рамку в единицах карты', () => {
    const { container } = renderLayer();
    const mask = container.querySelector('#china-land-mask');

    expect(mask?.getAttribute('maskUnits')).toBe('userSpaceOnUse');
    expect(mask?.getAttribute('x')).toBe('-16');
    expect(mask?.getAttribute('y')).toBe('-16');
    expect(mask?.getAttribute('width')).toBe('806');
    expect(mask?.getAttribute('height')).toBe('601');
  });

  /*
   * Крупные формы не помечались вовсе: `data-hovered` был только у линии реки
   * и у подписи. Из-за этого под курсором Таримская впадина ничем не
   * отличалась от соседней, и понять, что именно выберешь, было нельзя.
   */
  it('помечает форму под курсором', () => {
    const { container } = renderLayer({
      onSelect: () => {},
      hoveredFeatureId: 'tarim-basin',
    });

    expect(
      container.querySelector('.relief-shape[data-feature-id="tarim-basin"]'),
    ).toHaveAttribute('data-hovered', 'true');
    expect(
      container.querySelector('.relief-shape[data-feature-id="gobi"]'),
    ).toHaveAttribute('data-hovered', 'false');
  });

  /* Декоративная форма целью не бывает и помечаться не должна. */
  it('не помечает форму без имени', () => {
    const { container } = renderLayer({ hoveredFeatureId: 'tarim-basin' });

    for (const shape of container.querySelectorAll(
      '.relief-shape:not([data-feature-id])',
    )) {
      expect(shape.getAttribute('data-hovered')).not.toBe('true');
    }
  });

  it('помечает озеро под курсором', () => {
    const { container } = renderLayer({
      onSelect: () => {},
      hoveredFeatureId: 'qinghai-lake',
    });

    const lake = container
      .querySelector('.lake-hit[data-feature-id="qinghai-lake"]')
      ?.closest('.lake');

    expect(lake).toHaveAttribute('data-hovered', 'true');
  });

  /*
   * Указатель слою больше не нужен: цель по нему считает карта одним
   * правилом (`physical-hit.ts`). Прежде узел формы перехватывал нажатие
   * раньше, чем считалось расстояние до реки, и точка в полутора единицах от
   * Янцзы доставалась Тибетскому нагорью.
   *
   * Узлы остаются ради клавиатуры: по ним ходит Tab, и Enter выбирает объект.
   */
  it('оставляет узлы клавиатуре, но не указателю', () => {
    const onSelect = vi.fn();
    const { container } = renderLayer({ onSelect });
    const river = container.querySelector<SVGPathElement>(
      '.river-line[data-feature-id="yangtze"]',
    )!;

    fireEvent.click(river);
    expect(onSelect).not.toHaveBeenCalled();

    expect(river.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(river, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('yangtze');
  });

  it('не отдаёт нажатие ни форме, ни цели озера', () => {
    const onSelect = vi.fn();
    const { container } = renderLayer({ onSelect });

    fireEvent.click(container.querySelector('.relief-shape[data-feature-id]')!);
    fireEvent.click(container.querySelector('.lake-hit')!);

    expect(onSelect).not.toHaveBeenCalled();
  });

  /*
   * Амур идёт ровно по государственной границе. Под маской от линии
   * оставалась половина толщины, и та под штрихом границы, — река пропадала
   * с карты вовсе. Реки уже обрезаны по рамке карты генератором
   * `generate:physical`; за границу страны они выходят намеренно, как на
   * любой физической карте: река не кончается на границе.
   */
  it('не прячет реки маской', () => {
    const { container } = renderLayer();
    const rivers = container.querySelector('.rivers');

    expect(rivers).not.toBeNull();
    expect(rivers?.getAttribute('mask')).toBeNull();
    expect(rivers?.getAttribute('clip-path')).toBeNull();
  });

  it('закрывает маской ступени, границы, исходы и озёра', () => {
    const { container } = renderLayer();

    for (const selector of [
      '.relief',
      '.region-outlines',
      '.relief-outcomes',
      '.lakes',
    ]) {
      expect(container.querySelector(selector)?.getAttribute('mask')).toBe(
        'url(#china-land-mask)',
      );
    }
  });
});
