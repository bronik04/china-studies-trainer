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
