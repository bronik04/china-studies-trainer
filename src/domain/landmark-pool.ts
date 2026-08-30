import type { Landmark } from '../content/landmarks';
import type { Region } from '../content/types';

/**
 * Пул «достопримечательность — регион»: без объектов, называющих свой регион.
 *
 * «Шанхайская башня» несёт ответ в собственном имени — вопрос о ней не
 * проверяет ничего. Исключается такой объект только из этой игры: в «найти» и
 * «назвать» имя региона в названии ничего не выдаёт.
 *
 * Правило, а не список: двух объектов, которые его нарушали, в каталоге больше
 * нет — Исторический центр Макао убран, а Фуцзяньские тулоу спрашиваются
 * коротким именем (решения владельца от 2026-08-30). Правило остаётся, чтобы
 * следующее пополнение каталога не вернуло вопрос, отвечающий сам на себя.
 *
 * Тот же приём, что у городов: из «город — регион» исключены города
 * муниципалитетов и САР, совпадающие с регионом именем (`App.tsx`).
 *
 * Сверяются русские имена подстрокой, без словаря форм: «Шанхайская» содержит
 * «Шанхай», и падежи с прилагательными покрываются сами.
 */
export function regionAnswerableLandmarks(
  pool: readonly Landmark[],
  regions: readonly Region[],
): readonly Landmark[] {
  const regionNameById = new Map(
    regions.map((region) => [region.id, region.nameRu.toLowerCase()]),
  );

  return pool.filter((landmark) => {
    const regionName = regionNameById.get(landmark.regionId);

    return (
      regionName === undefined ||
      !landmark.nameRu.toLowerCase().includes(regionName)
    );
  });
}
