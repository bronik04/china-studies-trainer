/**
 * Загрузка слоя сопредельных государств по требованию.
 *
 * Отдельным крошечным модулем, а не внутри `CountryLayer.tsx`: тот и есть
 * содержимое отложенного куска — вместе с ним приезжает геометрия четырнадцати
 * стран, 27 КБ, — и статический импорт из него притащил бы обратно всё, ради
 * чего кусок отделяли. Тот же приём и тот же довод, что у физической карты.
 *
 * Загруженный модуль запоминается, чтобы слой появлялся без мигания: карта
 * спрашивает `loadedCountryLayer()` при монтировании, а приложение тянет
 * модуль заранее, в простое после первого экрана (`prefetchScreens`).
 */

export type CountryMap = typeof import('./CountryLayer');

let loaded: CountryMap | null = null;
let loading: Promise<CountryMap> | null = null;

/** Модуль, если он уже загружен. Иначе null — ждать здесь нечего. */
export function loadedCountryLayer(): CountryMap | null {
  return loaded;
}

export function loadCountryLayer(): Promise<CountryMap> {
  /*
   * Неудача не запоминается: сеть возвращается, и следующая попытка обязана
   * идти в сеть заново.
   */
  loading ??= import('./CountryLayer').then(
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
