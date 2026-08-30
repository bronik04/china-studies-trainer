import type { Landmark } from '../content/landmarks';
import type { Region } from '../content/types';

/**
 * Пул «достопримечательность — регион»: без объектов, называющих свой регион.
 *
 * «Исторический центр Макао», «Фуцзяньские тулоу» и «Шанхайская башня» несут
 * ответ в собственном имени — вопрос о них не проверяет ничего. Такие объекты
 * исключаются только из этой игры: в «найти» и «назвать» имя региона в
 * названии ничего не выдаёт.
 *
 * Тот же приём, что у городов: из «город — регион» исключены города
 * муниципалитетов и САР, совпадающие с регионом именем (`App.tsx`).
 *
 * Сверяются русские имена подстрокой, без словаря форм: «Фуцзяньские»
 * содержит «Фуцзянь», и падежи с прилагательными покрываются сами.
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
