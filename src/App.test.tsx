import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

it('shows the topic page', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Провинции и столицы Китая' }),
  ).toBeInTheDocument();
});

it('shows the interactive map and keeps its selection in the page state', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Интерактивная карта' }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Сычуань (四川省)' }));

  expect(screen.getByRole('status')).toHaveTextContent('Выбрано: Сычуань (四川省)');
});
