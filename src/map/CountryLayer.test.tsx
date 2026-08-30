import { fireEvent, render, screen } from '@testing-library/react';
import { countries } from '../content/countries';
import { CountryLayer } from './CountryLayer';

function renderLayer(
  onSelect: (id: string) => void = () => {},
  showsLabels = true,
) {
  return render(
    <svg>
      <CountryLayer
        selectedCountryId={null}
        onSelect={onSelect}
        showsLabels={showsLabels}
      />
    </svg>,
  );
}

it('рисует все четырнадцать стран и называет каждую', () => {
  renderLayer();

  expect(screen.getAllByRole('button')).toHaveLength(countries.length);
  expect(
    screen.getByRole('button', { name: 'Монголия, 蒙古国' }),
  ).toBeInTheDocument();
});

it('отдаёт нажатие по стране', () => {
  const onSelect = vi.fn();
  renderLayer(onSelect);

  fireEvent.click(screen.getByRole('button', { name: 'Непал, 尼泊尔' }));

  expect(onSelect).toHaveBeenCalledWith('nepal');
});

it('отвечает с клавиатуры', () => {
  const onSelect = vi.fn();
  renderLayer(onSelect);

  fireEvent.keyDown(screen.getByRole('button', { name: 'Лаос, 老挝' }), {
    key: 'Enter',
  });

  expect(onSelect).toHaveBeenCalledWith('laos');
});

it('спорный участок — не цель: ни роли, ни фокуса', () => {
  const { container } = renderLayer();
  const disputed = container.querySelectorAll('[data-disputed-id]');

  expect(disputed.length).toBeGreaterThanOrEqual(9);
  for (const shape of disputed) {
    expect(shape.getAttribute('role')).toBeNull();
    expect(shape.getAttribute('tabindex')).toBeNull();
  }
});

it('называет спорный участок словами источника', () => {
  renderLayer();

  expect(screen.getByText(/Аксайчин — спорная территория/)).toBeInTheDocument();
});

it('прячет подписи, когда подпись и есть ответ', () => {
  const { container } = renderLayer(() => {}, false);

  expect(container.querySelectorAll('.country-label')).toHaveLength(0);
});
