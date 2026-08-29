import type { Source } from './types';
import { sourceById, sources } from './sources';

it('находит запись реестра по id', () => {
  expect(sourceById('prc-administrative-divisions-2022')?.organization).toBe(
    '中国政府网',
  );
});

it('возвращает undefined для неизвестного id', () => {
  expect(sourceById('missing')).toBeUndefined();
});

it('короткие имена крупных организаций фактов заданы', () => {
  expect(sourceById('britannica-sichuan')?.shortLabel).toBe('Britannica');
  expect(sourceById('bre-earthquake')?.shortLabel).toBe('БРЭ');
  expect(sourceById('unesco-sichuan-panda-1213')?.shortLabel).toBe('ЮНЕСКО');
});

/*
 * Одна организация — одно короткое имя. Иначе строка карточки могла бы
 * назвать одну и ту же организацию двумя словами.
 */
it('организация несёт один и тот же shortLabel во всех записях', () => {
  const byOrganization = new Map<string, string | undefined>();
  /*
   * Аннотация расширяет литеральный союз `as const`-реестра до Source:
   * у записей без shortLabel самого свойства нет, и без расширения обращение
   * к нему не компилируется.
   */
  const registry: readonly Source[] = sources;
  for (const source of registry) {
    if (byOrganization.has(source.organization)) {
      expect(source.shortLabel).toBe(byOrganization.get(source.organization));
    } else {
      byOrganization.set(source.organization, source.shortLabel);
    }
  }
});

/*
 * Идентификаторы уникальны. Проверки не было, и реестр успел накопить девять
 * задвоенных записей: `britannica-beijing` жил в двух экземплярах с разными
 * «Подтверждает», а восемь страниц ЮНЕСКО были заведены дважды под одним и тем
 * же именем. `sourceById` в таком случае молча отдаёт первую, и вторая половина
 * сведений о покрытии пропадает из карточек.
 */
it('идентификаторы источников не повторяются', () => {
  const seen = new Map<string, number>();

  for (const source of sources) {
    seen.set(source.id, (seen.get(source.id) ?? 0) + 1);
  }

  expect([...seen].filter(([, count]) => count > 1)).toEqual([]);
});
