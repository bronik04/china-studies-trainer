import { render, screen } from '@testing-library/react';
import { regions } from '../content/regions';
import { TWO_COLUMN_QUERY } from '../design/breakpoints';
import { regionsWord } from './region-count';
import { RegionAnswerList } from './RegionAnswerList';

function renderList(presentation: 'inline' | 'disclosure') {
  return render(
    <RegionAnswerList
      presentation={presentation}
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
    />,
  );
}

it('склоняет слово «регион» по числу', () => {
  expect(regionsWord(1)).toBe('регион');
  expect(regionsWord(34)).toBe('региона');
  expect(regionsWord(11)).toBe('регионов');
  expect(regionsWord(25)).toBe('регионов');
});

it('обычный вид отдаёт список без обёртки', () => {
  const { container } = renderList('inline');

  expect(container.querySelector('details')).toBeNull();
  expect(
    screen.getByRole('list', { name: 'Список регионов карты' }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(34);
});

it('свёрнутый вид называет, что внутри и сколько', () => {
  renderList('disclosure');

  expect(screen.getByText('Ответить из списка (34 региона)')).toBeInTheDocument();
});

it('без matchMedia считает экран узким и раскрывает список', () => {
  // В jsdom `window.matchMedia` нет. Раскрытый по умолчанию список делает
  // остальные проверки независимыми от вёрстки: они отвечают его кнопками.
  const { container } = renderList('disclosure');

  expect(container.querySelector('details')).toHaveAttribute('open');
});

it('на широком экране список свёрнут: 34 кнопки не должны стоять в обходе Tab', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === TWO_COLUMN_QUERY,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  const { container } = renderList('disclosure');

  expect(container.querySelector('details')).not.toHaveAttribute('open');

  vi.unstubAllGlobals();
});

it('закрытый регион не отвечает и выключен', () => {
  const select = vi.fn();
  render(
    <RegionAnswerList
      regions={regions}
      selectedRegionId={null}
      onSelect={select}
      outcomes={{ sichuan: 'first-try' }}
    />,
  );

  const button = screen.getByRole('button', { name: /^Сычуань \(四川省\)/ });

  expect(button).toBeDisabled();
  expect(button).toHaveAccessibleName('Сычуань (四川省) — взят с первой попытки');
});
