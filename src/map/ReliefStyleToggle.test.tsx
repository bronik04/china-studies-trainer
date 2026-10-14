import { fireEvent, render, screen } from '@testing-library/react';
import { ReliefStyleToggle } from './ReliefStyleToggle';

it('называет группу и оба вида словами', () => {
  render(<ReliefStyleToggle name="r" value="color" onChange={() => {}} />);

  const group = screen.getByRole('group', { name: 'Рельеф' });

  expect(group).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'В цвете' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Тушью' })).not.toBeChecked();
});

it('сообщает выбранный вид', () => {
  const onChange = vi.fn();
  render(<ReliefStyleToggle name="r" value="color" onChange={onChange} />);

  fireEvent.click(screen.getByRole('radio', { name: 'Тушью' }));

  expect(onChange).toHaveBeenCalledWith('ink');
});
