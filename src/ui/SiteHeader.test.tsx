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

/*
 * Пока название не было кнопкой, попасть на главную было нечем: «Режимы» ведёт
 * на раздел внутри неё, и герой с единственным главным шагом навигацией не
 * доставался.
 */
it('название ведёт на главную', () => {
  const onNavigate = vi.fn();
  render(<SiteHeader current="atlas" onNavigate={onNavigate} />);

  fireEvent.click(screen.getByRole('button', { name: /^Китай/ }));

  expect(onNavigate).toHaveBeenCalledWith('home');
});

it('название говорит, что оно делает, и не теряет видимую подпись', () => {
  render(<SiteHeader current={null} onNavigate={vi.fn()} />);

  // WCAG 2.5.3: доступное имя содержит видимую подпись целиком.
  expect(
    screen.getByRole('button', {
      name: 'Китай 中国 · страноведение — на главную',
    }),
  ).toBeInTheDocument();
});

it('открытая главная помечена на названии, а не на «Режимах»', () => {
  render(<SiteHeader current="home" onNavigate={vi.fn()} />);

  expect(screen.getByRole('button', { name: /^Китай/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(screen.getByRole('button', { name: 'Режимы' })).not.toHaveAttribute(
    'aria-current',
  );
});

it('навигация названа: на странице она не единственная', () => {
  render(<SiteHeader current={null} onNavigate={vi.fn()} />);

  expect(screen.getByRole('navigation', { name: 'Разделы сайта' })).toBeInTheDocument();
});

it('китайская подпись помечена языком: иначе её наберёт не тот шрифт', () => {
  const { container } = render(<SiteHeader current={null} onNavigate={vi.fn()} />);

  expect(container.querySelector('[lang="zh-Hans"]')).toHaveTextContent('中国');
});
