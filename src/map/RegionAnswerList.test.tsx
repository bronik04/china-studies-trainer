import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../content/regions';
import { regionsWord } from '../content/region-count';
import { RegionAnswerList } from './RegionAnswerList';

function renderList(presentation: 'inline' | 'panel' = 'inline') {
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

function renderPanel() {
  render(
    <RegionAnswerList
      presentation="panel"
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
    />,
  );

  return screen.getByLabelText('Найти регион');
}

it('в панели показывает поле поиска и сужает список по запросу', () => {
  const search = renderPanel();

  expect(screen.getAllByRole('button')).toHaveLength(regions.length);

  fireEvent.change(search, { target: { value: 'хунань' } });

  const found = screen.getAllByRole('button');
  expect(found).toHaveLength(1);
  expect(found[0]).toHaveTextContent('Хунань');
});

it('в панели ищет по пиньиню без тонов', () => {
  const search = renderPanel();

  fireEvent.change(search, { target: { value: 'hunan' } });

  expect(screen.getAllByRole('button')[0]).toHaveTextContent('Хунань');
});

it('в панели сообщает, что по запросу ничего нет', () => {
  const search = renderPanel();

  fireEvent.change(search, { target: { value: 'щщщ' } });

  expect(screen.getByText(/Ничего не найдено/)).toBeInTheDocument();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
