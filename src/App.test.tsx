import { render, screen } from '@testing-library/react';
import App from './App';

it('shows the application heading', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Тренажёр по страноведению Китая' }),
  ).toBeInTheDocument();
});
