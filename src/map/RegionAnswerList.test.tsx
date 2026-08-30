import { render, screen } from '@testing-library/react';
import { regions } from '../content/regions';
import { RegionAnswerList } from './RegionAnswerList';

function renderList() {
  return render(
    <RegionAnswerList
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
    />,
  );
}

it('отдаёт список без обёртки', () => {
  const { container } = renderList();

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

it('называет отметку словом, а не только цветом', () => {
  render(
    <RegionAnswerList
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      neighbourStates={{ hubei: 'marked' }}
    />,
  );

  const button = screen.getByRole('button', { name: /^Хубэй/ });

  expect(button).toHaveAccessibleName('Хубэй (湖北省) — отмечен');
  expect(button).toHaveAttribute('aria-pressed', 'true');
});

it('называет исход разбора словом у каждого состояния', () => {
  render(
    <RegionAnswerList
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      neighbourStates={{ hubei: 'found', hunan: 'missed', gansu: 'extra' }}
    />,
  );

  expect(screen.getByRole('button', { name: /^Хубэй/ })).toHaveAccessibleName(
    'Хубэй (湖北省) — найден',
  );
  expect(screen.getByRole('button', { name: /^Хунань/ })).toHaveAccessibleName(
    'Хунань (湖南省) — пропущен',
  );
  expect(screen.getByRole('button', { name: /^Ганьсу/ })).toHaveAccessibleName(
    'Ганьсу (甘肃省) — лишний',
  );
});
