import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { regions } from '../content/regions';
import { ChinaMap } from './ChinaMap';

/*
 * Отдельным файлом, а не рядом с остальными проверками карты: там физический
 * слой загружают в `beforeAll`, и модуль лежит в памяти. Здесь загрузчик
 * подменён отказом, а подмена модуля — свойство файла, не теста.
 *
 * Кусок физической карты приезжает по сети, и в классе с упавшим Wi-Fi он
 * может не приехать. Молча оставленная политическая карта на вкладке
 * «Физическая» выглядела бы поломкой без объяснения, а на вопрос «найдите
 * реку» отвечать было бы нечем.
 */
vi.mock('./load-physical-map', () => ({
  loadedPhysicalMap: () => null,
  loadPhysicalMap: () => Promise.reject(new Error('нет связи')),
}));

it('говорит вслух, когда физический слой не загрузился', async () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      variant="physical"
    />,
  );

  const note = await screen.findByText(/Физическая карта не загрузилась/);

  expect(note).toHaveAttribute('role', 'status');
  expect(note).toHaveTextContent(/обновите страницу/);
});

/*
 * На политической карте сообщения нет: там ничего и не грузилось. Ищется
 * именно оно, а не любая строка состояния: у карты есть ещё одна — та, что
 * называет выбранный регион.
 */
it('молчит на политической карте', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
    />,
  );

  expect(
    screen.queryByText(/Физическая карта не загрузилась/),
  ).not.toBeInTheDocument();
});
