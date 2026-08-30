import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { regions } from '../../content/regions';
import { REGION_NEIGHBOURS } from '../../map/region-neighbours';
import { CORRECT_PAUSE_MS, WRONG_PAUSE_MS } from './round-pace';
import { NeighboursRound } from './NeighboursRound';

function renderRound(onFinish = () => {}) {
  return render(
    <NeighboursRound
      regions={regions}
      language="ru"
      roundId="r1"
      seed={1}
      onFinish={onFinish}
      onExit={() => {}}
    />,
  );
}

/** Список — в панели оболочки: перед ответом её нужно открыть. */
function openAnswerList() {
  const toggle = screen.getByRole('button', { name: 'Ответить из списка' });
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(toggle);
  }
}

function askedRegion() {
  const name = screen.getByTestId('neighbours-target').textContent;

  return regions.find((region) => region.nameRu === name)!;
}

/**
 * Состояние называют оба ответчика — и область карты, и кнопка списка, — так
 * что запрос по слову находит две. Проверяем список: он и есть равнозначный
 * способ ответа.
 */
function list() {
  return within(screen.getByRole('list', { name: 'Список регионов карты' }));
}

function markFromList(regionId: string) {
  const region = regions.find((item) => item.id === regionId)!;
  fireEvent.click(
    list().getByRole('button', {
      name: new RegExp(`^${region.nameRu} \\(${region.nameZh}\\)`),
    }),
  );
}

it('спрашивает соседей названного региона', () => {
  renderRound();

  expect(screen.getByText('Нажмите всех соседей')).toBeInTheDocument();
  expect(REGION_NEIGHBOURS[askedRegion().id].length).toBeGreaterThan(1);
});

it('до «Готово» карта исход не показывает', () => {
  renderRound();
  openAnswerList();

  const target = askedRegion();
  markFromList(REGION_NEIGHBOURS[target.id][0]);

  expect(list().getByRole('button', { name: /отмечен$/ })).toBeInTheDocument();
  expect(list().queryByRole('button', { name: /найден$/ })).toBeNull();
  expect(list().queryByRole('button', { name: /пропущен$/ })).toBeNull();
});

it('снимает отметку повторным нажатием', () => {
  renderRound();
  openAnswerList();

  const neighbourId = REGION_NEIGHBOURS[askedRegion().id][0];
  markFromList(neighbourId);
  markFromList(neighbourId);

  expect(list().queryByRole('button', { name: /отмечен$/ })).toBeNull();
});

it('после «Готово» называет найденных, пропущенных и лишних', () => {
  renderRound();
  openAnswerList();

  const target = askedRegion();
  const [firstNeighbour] = REGION_NEIGHBOURS[target.id];
  const stranger = regions.find(
    (region) =>
      region.id !== target.id &&
      !REGION_NEIGHBOURS[target.id].includes(region.id),
  )!;

  markFromList(firstNeighbour);
  markFromList(stranger.id);
  fireEvent.click(screen.getByRole('button', { name: 'Готово' }));

  expect(list().getByRole('button', { name: /найден$/ })).toBeInTheDocument();
  expect(list().getAllByRole('button', { name: /пропущен$/ }).length).toBe(
    REGION_NEIGHBOURS[target.id].length - 1,
  );
  expect(list().getByRole('button', { name: /лишний$/ })).toBeInTheDocument();
});

it('спрошенный регион отметить нельзя: он не сосед сам себе', () => {
  renderRound();
  openAnswerList();

  markFromList(askedRegion().id);

  expect(list().queryByRole('button', { name: /отмечен$/ })).toBeNull();
});

it('верный ответ идёт дальше сам, без кнопки «Далее»', () => {
  vi.useFakeTimers();
  try {
    renderRound();
    openAnswerList();

    const target = askedRegion();
    for (const id of REGION_NEIGHBOURS[target.id]) {
      markFromList(id);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Готово' }));

    expect(screen.queryByRole('button', { name: 'Далее' })).toBeNull();
    expect(screen.getByText('Верно: все соседи и ничего лишнего.')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(CORRECT_PAUSE_MS);
    });

    expect(askedRegion().id).not.toBe(target.id);
  } finally {
    vi.useRealTimers();
  }
});

it('после ошибки разбор держится дольше и раунд едет сам', () => {
  vi.useFakeTimers();
  try {
    renderRound();
    fireEvent.click(screen.getByRole('button', { name: 'Готово' }));

    const target = askedRegion();

    act(() => {
      vi.advanceTimersByTime(CORRECT_PAUSE_MS);
    });
    expect(askedRegion().id).toBe(target.id);

    act(() => {
      vi.advanceTimersByTime(WRONG_PAUSE_MS - CORRECT_PAUSE_MS);
    });
    expect(askedRegion().id).not.toBe(target.id);
  } finally {
    vi.useRealTimers();
  }
});
