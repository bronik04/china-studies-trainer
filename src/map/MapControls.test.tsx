import { fireEvent, render, screen } from '@testing-library/react';
import { MapControls } from './MapControls';

it('requests the next zoom level from the initial view', () => {
  const change = vi.fn();
  render(<MapControls zoom={1} onZoomChange={change} />);

  fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }));

  expect(change).toHaveBeenCalledWith(1.25);
});

it('disables controls that would not change the initial view', () => {
  render(<MapControls zoom={1} onZoomChange={() => {}} />);

  expect(screen.getByRole('button', { name: 'Уменьшить' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Сбросить вид' })).toBeDisabled();
});

it('resets a magnified map to its initial view', () => {
  const change = vi.fn();
  render(<MapControls zoom={1.5} onZoomChange={change} />);

  fireEvent.click(screen.getByRole('button', { name: 'Сбросить вид' }));

  expect(change).toHaveBeenCalledWith(1);
});
