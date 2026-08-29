/**
 * Реестр источников и его зеркало в `docs/sources/sources.md` обязаны
 * совпадать: `AGENTS.md` требует, чтобы у каждого факта был источник в
 * `docs/sources`, а страница карточки показывает запись из реестра.
 *
 * Проверки не было, и зеркало успело разойтись двумя способами сразу.
 * Восьми записей о правителях в нём не оказалось вовсе — их добавили в реестр,
 * а документ забыли. Десять блоков, наоборот, задвоились: страницы ЮНЕСКО
 * заводили дважды под одним и тем же именем, и `sourceById` молча отдавал
 * первую запись, теряя половину сведений о покрытии.
 *
 * Тексты лицензий здесь не сверяются: в документе они разные по существу —
 * public domain у Natural Earth, CC0 у Викиданных, CC BY-SA IGO у ЮНЕСКО, — и
 * в реестре такого поля нет.
 */
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { expect, it } from 'vitest';
import { sources } from '../src/content/sources';

const mirror = readFileSync(
  resolvePath(import.meta.dirname, '../docs/sources/sources.md'),
  'utf8',
);

/* Заголовок блока источника — идентификатор; прозаические разделы не в счёт. */
const documented = new Set(
  [...mirror.matchAll(/^## ([a-z0-9][a-z0-9.-]*)$/gm)].map((match) => match[1]),
);

it('каждая запись реестра отражена в документе', () => {
  const missing = sources
    .map((source) => source.id)
    .filter((id) => !documented.has(id));

  expect(missing).toEqual([]);
});

it('в документе нет блоков, которых нет в реестре', () => {
  const known = new Set<string>(sources.map((source) => source.id));

  expect([...documented].filter((id) => !known.has(id))).toEqual([]);
});

it('блок источника не повторяется', () => {
  const headings = [...mirror.matchAll(/^## ([a-z0-9][a-z0-9.-]*)$/gm)].map(
    (match) => match[1],
  );

  expect(headings.length).toBe(documented.size);
});

it('документ подтверждает то же, что и реестр', () => {
  /*
   * Документ режется по заголовкам, а не вычитывается регулярным выражением с
   * заглядыванием вперёд: у последнего блока следующего заголовка нет, и
   * такое выражение молча пропускало бы его целиком.
   */
  const parts = mirror.split(/^## /m).slice(1);
  const blockOf = new Map(
    parts.map((part) => [part.slice(0, part.indexOf('\n')).trim(), part]),
  );
  const wrong: string[] = [];

  for (const source of sources) {
    const block = blockOf.get(source.id);

    if (block === undefined) {
      continue;
    }

    for (const covers of source.covers) {
      if (!block.includes(covers)) {
        wrong.push(`${source.id}: «${covers}»`);
      }
    }
  }

  expect(wrong).toEqual([]);
});
