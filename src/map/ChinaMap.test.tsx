import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../content/regions';
import { ChinaMap } from './ChinaMap';

it('selects Sichuan when its map area receives Enter', () => {
  const select = vi.fn();
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={select}
      onClear={() => {}}
    />,
  );

  fireEvent.keyDown(screen.getByRole('button', { name: 'Сычуань, 四川省' }), {
    key: 'Enter',
  });

  expect(select).toHaveBeenCalledWith('sichuan');
});

it('selects Sichuan when its map area receives Space', () => {
  const select = vi.fn();
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={select}
      onClear={() => {}}
    />,
  );

  fireEvent.keyDown(screen.getByRole('button', { name: 'Сычуань, 四川省' }), {
    key: ' ',
  });

  expect(select).toHaveBeenCalledWith('sichuan');
});

it('announces the selected region in text', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={() => {}}
      onClear={() => {}}
    />,
  );

  expect(screen.getByRole('status')).toHaveTextContent('Выбрано: Сычуань (四川省)');
});

it('clears the selection with Escape', () => {
  const clear = vi.fn();
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={() => {}}
      onClear={clear}
    />,
  );

  fireEvent.keyDown(screen.getByRole('button', { name: 'Сычуань, 四川省' }), {
    key: 'Escape',
  });

  expect(clear).toHaveBeenCalledOnce();
});

it('renders a named text alternative with 34 region actions', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
    />,
  );

  expect(
    screen.getByRole('list', { name: 'Список регионов карты' }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(34);
});

it('карта больше не печатает атрибуцию: её ставит страница', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
    />,
  );

  expect(screen.queryByRole('link', { name: 'CC BY 4.0' })).toBeNull();
});

it('retains region types for future exercise logic', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
    />,
  );

  expect(document.querySelector('#sichuan')).toHaveAttribute(
    'data-region-kind',
    'province',
  );
  expect(document.querySelector('#beijing')).toHaveAttribute(
    'data-region-kind',
    'municipality',
  );
  expect(document.querySelector('#xinjiang')).toHaveAttribute(
    'data-region-kind',
    'autonomous-region',
  );
  expect(document.querySelector('#hong-kong')).toHaveAttribute(
    'data-region-kind',
    'sar',
  );
});

it('отмечает область состоянием ответа', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      answerStates={{ sichuan: 'correct', yunnan: 'incorrect' }}
    />,
  );

  expect(document.querySelector('#sichuan')).toHaveAttribute(
    'data-answer-state',
    'correct',
  );
  expect(document.querySelector('#yunnan')).toHaveAttribute(
    'data-answer-state',
    'incorrect',
  );
  expect(document.querySelector('#hebei')).not.toHaveAttribute('data-answer-state');
});

it('помечает недоступную область для вспомогательных технологий', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      answerStates={{ tibet: 'disabled' }}
    />,
  );

  expect(document.querySelector('#tibet')).toHaveAttribute('aria-disabled', 'true');
});

it('не даёт выбрать область, у которой уже есть результат ответа', () => {
  const select = vi.fn();
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={select}
      onClear={() => {}}
      answerStates={{ sichuan: 'correct', yunnan: 'incorrect' }}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Сычуань, 四川省' }));
  fireEvent.click(screen.getByRole('button', { name: 'Юньнань, 云南省' }));

  expect(select).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Сычуань (四川省)' })).toBeDisabled();
  expect(document.querySelector('#sichuan')).toHaveAttribute('aria-disabled', 'true');
});

it('не выбирает недоступную область', () => {
  const select = vi.fn();
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={select}
      onClear={() => {}}
      answerStates={{ sichuan: 'disabled' }}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Сычуань, 四川省' }));

  expect(select).not.toHaveBeenCalled();
});

it('в неинтерактивном режиме не выбирает область', () => {
  const select = vi.fn();
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={select}
      onClear={() => {}}
      interactive={false}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Сычуань, 四川省' }));

  expect(select).not.toHaveBeenCalled();
});

it('в неинтерактивном режиме убирает области из обхода клавиатурой', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={() => {}}
      onClear={() => {}}
      interactive={false}
    />,
  );

  expect(document.querySelector('#sichuan')).toHaveAttribute('tabindex', '-1');
  expect(
    [...document.querySelectorAll('[data-region-id]')].every(
      (area) => area.getAttribute('tabindex') === '-1',
    ),
  ).toBe(true);
});

it('в неинтерактивном режиме всё равно подсвечивает выбранное', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={() => {}}
      onClear={() => {}}
      interactive={false}
    />,
  );

  expect(document.querySelector('#sichuan')).toHaveAttribute('data-selected', 'true');
});

it('в неинтерактивном режиме не называет подсвеченный регион', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={() => {}}
      onClear={() => {}}
      interactive={false}
    />,
  );

  expect(screen.queryByText(/Выбрано: Сычуань/)).toBeNull();
  expect(screen.queryByRole('list', { name: 'Список регионов карты' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Сычуань (四川省)' })).toBeNull();
});

it('в неинтерактивном режиме объясняет, что на карте есть подсветка', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={() => {}}
      onClear={() => {}}
      interactive={false}
    />,
  );

  expect(screen.getByText('На карте подсвечена одна область.')).toBeInTheDocument();
});

it('в неинтерактивном режиме не зовёт выбирать регион на карте', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={() => {}}
      onClear={() => {}}
      interactive={false}
    />,
  );

  expect(screen.queryByText('Выберите регион на схеме или в списке.')).toBeNull();
});

it('на экране ответа карта не печатает заголовок и подсказку', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      usage="answer"
    />,
  );

  expect(
    screen.queryByRole('heading', { name: 'Интерактивная карта' }),
  ).toBeNull();
  expect(screen.queryByText('Выберите регион на схеме или в списке.')).toBeNull();
  expect(
    screen.getByRole('region', { name: 'Карта регионов' }),
  ).toBeInTheDocument();
});

it('на экране ответа карта не объявляет выбор: о нём говорит карточка ответа', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      usage="answer"
    />,
  );

  expect(screen.queryByRole('status')).toBeNull();
});

it('на экране ответа список регионов ставит страница, а не карта', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      usage="answer"
    />,
  );

  expect(screen.queryByRole('list', { name: 'Список регионов карты' })).toBeNull();
});

it('в режиме «назвать регион» карта и на экране ответа объясняет подсветку', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={() => {}}
      onClear={() => {}}
      usage="answer"
      interactive={false}
    />,
  );

  expect(screen.getByText('На карте подсвечена одна область.')).toBeInTheDocument();
});

it('нажатие на увеличенную цель выбирает мелкий регион, а не соседний', () => {
  const select = vi.fn();
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={select}
      onClear={() => {}}
    />,
  );

  // Цель Пекина заходит на территорию Хэбэя: у самого Пекина под палец есть
  // 19 px при требуемых 24 (см. scripts/generate-hit-targets.ts).
  const hit = container.querySelector('[data-hit-region-id="beijing"]')!;
  fireEvent.click(hit);

  expect(select).toHaveBeenCalledWith('beijing');
});

it('справочная карта красит области по типу региона', () => {
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
    />,
  );

  const areas = [...container.querySelectorAll('[data-region-id]')];

  expect(areas).not.toHaveLength(0);
  for (const area of areas) {
    expect(
      area.getAttribute('data-region-kind'),
      area.getAttribute('data-region-id') ?? '',
    ).toMatch(/^(province|autonomous-region|municipality|sar)$/);
  }
  expect(container.querySelector('[data-land-tone]')).toBeNull();
});

it('в игровом режиме отмечает только закрытые регионы', () => {
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      variant="fill"
      outcomes={{ sichuan: 'first-try', hunan: 'failed' }}
    />,
  );

  expect(
    container.querySelector('[data-region-id="sichuan"]')?.getAttribute('data-outcome'),
  ).toBe('first-try');
  expect(
    container.querySelector('[data-region-id="hunan"]')?.getAttribute('data-outcome'),
  ).toBe('failed');
  expect(
    container.querySelector('[data-region-id="yunnan"]')?.getAttribute('data-outcome'),
  ).toBeNull();
  expect(container.querySelector('.china-map')?.getAttribute('data-map-variant')).toBe(
    'fill',
  );
});

it('отмечает промах и показ разными видами подсветки', () => {
  const { container, rerender } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      variant="fill"
      highlight={{ regionId: 'gansu', kind: 'miss' }}
    />,
  );

  expect(
    container.querySelector('[data-region-id="gansu"]')?.getAttribute('data-highlight'),
  ).toBe('miss');
  expect(
    container.querySelector('[data-region-id="hunan"]')?.getAttribute('data-highlight'),
  ).toBeNull();

  rerender(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      variant="fill"
      highlight={{ regionId: 'hunan', kind: 'reveal' }}
    />,
  );

  expect(
    container.querySelector('[data-region-id="hunan"]')?.getAttribute('data-highlight'),
  ).toBe('reveal');
  expect(
    container.querySelector('[data-region-id="gansu"]')?.getAttribute('data-highlight'),
  ).toBeNull();
});

it('в игровом режиме карта не заводит второй aria-live о выборе', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      variant="fill"
    />,
  );

  expect(screen.queryByRole('status')).toBeNull();
});

it('не выбирает уже закрашенный регион', () => {
  const select = vi.fn();
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={select}
      onClear={() => {}}
      variant="fill"
      outcomes={{ sichuan: 'first-try' }}
    />,
  );

  fireEvent.click(container.querySelector('[data-region-id="sichuan"]')!);
  fireEvent.click(screen.getByRole('button', { name: /^Сычуань \(四川省\)/ }));

  expect(select).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /^Сычуань \(四川省\)/ })).toBeDisabled();
});

it('называет исход региона в доступном имени', () => {
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      variant="fill"
      outcomes={{ sichuan: 'second-try', hunan: 'failed' }}
    />,
  );

  expect(container.querySelector('[data-region-id="sichuan"]')).toHaveAttribute(
    'aria-label',
    'Сычуань, 四川省 — взят со второй попытки',
  );
  expect(container.querySelector('[data-region-id="hunan"]')).toHaveAttribute(
    'aria-label',
    'Хунань, 湖南省 — не угадан',
  );
  expect(
    screen.getByRole('button', { name: 'Хунань (湖南省) — не угадан' }),
  ).toBeInTheDocument();
});

it('на паузе не отвечает, но список и фокус остаются на месте', () => {
  const select = vi.fn();
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={select}
      onClear={() => {}}
      variant="fill"
      paused
    />,
  );

  const button = screen.getByRole('button', { name: 'Сычуань (四川省)' });
  button.focus();
  fireEvent.click(button);

  expect(select).not.toHaveBeenCalled();
  expect(button).toHaveAttribute('aria-disabled', 'true');
  expect(button).not.toBeDisabled();
  expect(document.activeElement).toBe(button);
});
