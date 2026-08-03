import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import { TopicSelectionPage } from './TopicSelectionPage';

it('shows the available topic and all 34 regions', () => {
  render(<TopicSelectionPage regions={regions} />);

  expect(
    screen.getByRole('heading', { name: 'Провинции и столицы Китая' }),
  ).toBeInTheDocument();
  expect(screen.getByText('34 региона')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(34);
});

it('shows all study forms for Sichuan', () => {
  render(<TopicSelectionPage regions={regions} />);

  const region = screen.getByRole('listitem', { name: /Сычуань/ });
  expect(region).toHaveTextContent('四川省');
  expect(region).toHaveTextContent('Sìchuān shěng');
  expect(region).toHaveTextContent('Административный центр: Чэнду (成都)');
});

it('запускает раунд выбранного режима на первом уровне', () => {
  const start = vi.fn();
  render(<TopicSelectionPage regions={regions} unlockedLevel={1} onStartRound={start} />);

  fireEvent.click(screen.getByRole('button', { name: 'Найти на карте' }));

  expect(start).toHaveBeenCalledWith('find-on-map', 1);
});

it('не предлагает закрытые уровни', () => {
  render(
    <TopicSelectionPage regions={regions} unlockedLevel={2} onStartRound={() => {}} />,
  );

  expect(screen.getByRole('radio', { name: 'Уровень 2' })).toBeInTheDocument();
  expect(screen.queryByRole('radio', { name: 'Уровень 3' })).toBeNull();
});

it('на четвёртом уровне предлагает один смешанный раунд', () => {
  const start = vi.fn();
  render(
    <TopicSelectionPage regions={regions} unlockedLevel={4} onStartRound={start} />,
  );

  fireEvent.click(screen.getByRole('radio', { name: 'Уровень 4' }));
  fireEvent.click(screen.getByRole('button', { name: 'Смешанный раунд' }));

  expect(start).toHaveBeenCalledWith('mixed', 4);
});
