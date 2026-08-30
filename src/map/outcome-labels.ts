import type { RegionOutcome } from '../domain/fill-round';

/**
 * Исход обязан быть доступен не только цветом: с программой чтения с экрана
 * ученик иначе не отличит закрашенный регион от ещё не спрошенного
 * (AGENTS.md: карта должна иметь текстовые альтернативы и не полагаться
 * только на цвет).
 */
export const OUTCOME_LABELS: Readonly<Record<RegionOutcome, string>> = {
  'first-try': 'взят с первой попытки',
  'second-try': 'взят со второй попытки',
  failed: 'не угадан',
};

/**
 * Состояния игры «соседи». Отметка и три исхода разбора: их четыре, а не три,
 * потому что «отмечен» — состояние до ответа, а не его исход.
 *
 * Слово обязательно по той же причине, что и у исходов заполнения: с
 * программой чтения с экрана ученик иначе не отличит отмеченную область от
 * найденной.
 */
export type NeighbourState = 'marked' | 'found' | 'missed' | 'extra';

export const NEIGHBOUR_LABELS: Readonly<Record<NeighbourState, string>> = {
  marked: 'отмечен',
  found: 'найден',
  missed: 'пропущен',
  extra: 'лишний',
};
