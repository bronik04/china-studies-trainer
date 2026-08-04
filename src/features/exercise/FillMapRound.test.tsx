import { act, fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import type { Region } from '../../content/types';
import { FillMapRound, MISS_FLASH_MS } from './FillMapRound';

function renderRound() {
  return render(
    <FillMapRound
      regions={regions}
      level={1}
      roundId="r1"
      seed={1}
      onFinish={() => {}}
      onExit={() => {}}
    />,
  );
}

/** На первом уровне в заголовке стоит русское название спрошенного региона. */
function askedRegion(): Region {
  const name = screen.getByTestId('fill-target').textContent;

  return regions.find((region) => region.nameRu === name)!;
}

/**
 * Ответ даётся кнопкой из равнозначного списка под картой: он не зависит от
 * геометрии SVG. Доступное имя собрано в ChinaMap.tsx как
 * `{nameRu} <span lang="zh-Hans">({nameZh})</span>`.
 */
function answerWith(region: Region) {
  fireEvent.click(
    screen.getByRole('button', { name: `${region.nameRu} (${region.nameZh})` }),
  );
}

function anyOtherRegion(region: Region): Region {
  return regions.find((candidate) => candidate.id !== region.id)!;
}

it('после верного ответа сразу спрашивает следующий регион без кнопки «Далее»', () => {
  renderRound();
  const first = askedRegion();

  answerWith(first);

  expect(askedRegion().id).not.toBe(first.id);
  expect(screen.queryByRole('button', { name: 'Далее' })).toBeNull();
});

it('промах уменьшает счётчик попыток и не меняет вопрос', () => {
  renderRound();
  const asked = askedRegion();

  answerWith(anyOtherRegion(asked));

  expect(screen.getByRole('status')).toHaveTextContent('Осталось попыток: 2');
  expect(askedRegion().id).toBe(asked.id);
});

it('промах не закрашивает нажатый регион, а только вспыхивает на нём', () => {
  const { container } = renderRound();
  const asked = askedRegion();
  const other = anyOtherRegion(asked);

  answerWith(other);

  const area = container.querySelector(`[data-region-id="${other.id}"]`);

  expect(area?.getAttribute('data-outcome')).toBeNull();
  expect(area?.getAttribute('data-highlight')).toBe('miss');
});

it('вспышка промаха гаснет сама', () => {
  vi.useFakeTimers();
  try {
    const { container } = renderRound();
    const asked = askedRegion();

    answerWith(anyOtherRegion(asked));
    act(() => {
      vi.advanceTimersByTime(MISS_FLASH_MS);
    });

    expect(container.querySelector('[data-highlight="miss"]')).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

it('на экране нет панели обратной связи', () => {
  const { container } = renderRound();

  expect(container.querySelector('.answer-feedback')).toBeNull();
});

it('показывает счётчик закрашенных регионов', () => {
  renderRound();

  expect(screen.getByTestId('fill-progress')).toHaveTextContent('0 из 34');
});
