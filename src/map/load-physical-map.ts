/**
 * Загрузка физической карты по требованию.
 *
 * Отдельным крошечным модулем, а не внутри `physical-map.ts`: тот и есть
 * содержимое отложенного куска, и статический импорт из него притащил бы
 * обратно всё, ради чего кусок отделяли.
 *
 * Загруженный модуль запоминается. Это не оптимизация повторных вызовов, а
 * условие того, чтобы слой появлялся без мигания: карта спрашивает
 * `loadedPhysicalMap()` прямо при монтировании и, если модуль уже здесь,
 * рисует слой первым же кадром. Приложение тянет его заранее, в простое после
 * первого экрана (`prefetchScreens`), поэтому «уже здесь» — обычный случай.
 */

export type PhysicalMap = typeof import('./physical-map');

let loaded: PhysicalMap | null = null;
let loading: Promise<PhysicalMap> | null = null;

/** Модуль, если он уже загружен. Иначе null — ждать здесь нечего. */
export function loadedPhysicalMap(): PhysicalMap | null {
  return loaded;
}

export function loadPhysicalMap(): Promise<PhysicalMap> {
  /*
   * Неудача не запоминается: сеть возвращается, и следующая попытка обязана
   * идти в сеть заново. Запомненный отказ означал бы, что вкладка «Физическая»
   * не откроется до перезагрузки страницы даже при вернувшейся связи.
   */
  loading ??= import('./physical-map').then(
    (module) => {
      loaded = module;

      return module;
    },
    (error: unknown) => {
      loading = null;

      throw error;
    },
  );

  return loading;
}
