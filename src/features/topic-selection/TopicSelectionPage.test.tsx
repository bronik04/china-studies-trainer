import { render, screen } from '@testing-library/react';
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
