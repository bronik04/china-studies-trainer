import { expect, it } from 'vitest';
import { regions } from '../../content/regions';
import { searchRegions } from './region-search';

const find = (query: string) => searchRegions(regions, query).map((r) => r.id);

it('пустой запрос возвращает все регионы', () => {
  expect(searchRegions(regions, '   ')).toHaveLength(regions.length);
});

it('находит по русскому названию без учёта регистра', () => {
  expect(find('хунань')).toContain('hunan');
});

it('находит по пиньиню, набранному без тонов', () => {
  expect(find('hunan')).toContain('hunan');
});

it('находит по иероглифам', () => {
  expect(find('湖南')).toContain('hunan');
});

it('находит по названию административного центра', () => {
  expect(find('чанша')).toContain('hunan');
});

it('не различает е и ё', () => {
  const withYo = find('ё');
  const withYe = find('е');

  expect(withYo.every((id) => withYe.includes(id))).toBe(true);
});

it('на бессмысленном запросе возвращает пусто', () => {
  expect(find('щщщ')).toEqual([]);
});
