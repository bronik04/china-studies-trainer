import { fireEvent, render, screen } from '@testing-library/react';
import { countries } from '../content/countries';
import { CountryLayer } from './CountryLayer';

function renderLayer(onSelect: (id: string) => void = () => {}) {
  return render(
    <svg>
      <CountryLayer selectedCountryId={null} onSelect={onSelect} />
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

it('подписей стран на карте нет: имя страны и есть ответ', () => {
  const { container } = renderLayer();

  expect(container.querySelectorAll('text')).toHaveLength(0);
});

it('без ответа по карте контуры перестают быть кнопками', () => {
  const { container } = render(
    <svg>
      <CountryLayer
        selectedCountryId={null}
        onSelect={() => {}}
        answers={false}
      />
    </svg>,
  );

  expect(screen.queryAllByRole('button')).toHaveLength(0);
  for (const shape of container.querySelectorAll('[data-country-id]')) {
    expect(shape.getAttribute('tabindex')).toBeNull();

    /*
     * Имя снимается вместе с ролью: фигура с именем остаётся в дереве
     * доступности и без роли, и читалка экрана объявила бы четырнадцать
     * названий вместо четырнадцати кнопок — а в «назвать страну» имя и есть
     * ответ.
     */
    expect(shape.getAttribute('aria-label')).toBeNull();
    expect(shape.getAttribute('aria-hidden')).toBe('true');
  }

  /* По этому признаку слою снимают курсор-палец: нажимать здесь не на что. */
  expect(
    container.querySelector('.country-layer')?.getAttribute('data-answers'),
  ).toBe('false');
});
