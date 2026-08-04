import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SiteHeader } from './SiteHeader';

it('ведёт во все три раздела', () => {
  const onNavigate = vi.fn();
  render(<SiteHeader current={null} onNavigate={onNavigate} />);

  fireEvent.click(screen.getByRole('button', { name: 'Атлас' }));
  expect(onNavigate).toHaveBeenCalledWith('atlas');

  fireEvent.click(screen.getByRole('button', { name: 'Коллекции' }));
  expect(onNavigate).toHaveBeenCalledWith('collections');

  fireEvent.click(screen.getByRole('button', { name: 'Режимы' }));
  expect(onNavigate).toHaveBeenCalledWith('modes');
});

it('открытый раздел помечен словом, а не только чертой', () => {
  render(<SiteHeader current="collections" onNavigate={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'Коллекции' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(screen.getByRole('button', { name: 'Атлас' })).not.toHaveAttribute(
    'aria-current',
  );
});

it('на главной ни один пункт не помечен открытым', () => {
  render(<SiteHeader current={null} onNavigate={vi.fn()} />);

  for (const name of ['Режимы', 'Атлас', 'Коллекции']) {
    expect(screen.getByRole('button', { name })).not.toHaveAttribute(
      'aria-current',
    );
  }
});

it('навигация названа: на странице она не единственная', () => {
  render(<SiteHeader current={null} onNavigate={vi.fn()} />);

  expect(screen.getByRole('navigation', { name: 'Разделы сайта' })).toBeInTheDocument();
});

it('китайская подпись помечена языком: иначе её наберёт не тот шрифт', () => {
  const { container } = render(<SiteHeader current={null} onNavigate={vi.fn()} />);

  expect(container.querySelector('[lang="zh-Hans"]')).toHaveTextContent('中国');
});
