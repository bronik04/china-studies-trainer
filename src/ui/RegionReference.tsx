import { citiesOfRegion, cityById } from '../content/cities';
import { sourceById } from '../content/sources';
import type { Fact, Region } from '../content/types';

/**
 * Справочник о регионе: центр, справка с источниками, города.
 *
 * Живёт здесь, а не в атласе, потому что поверхностей две. В атласе его
 * показывает карточка выбранного региона; на странице коллекции «по регионам»
 * он стоит там, где раньше было место под фотографию, которой нет.
 *
 * Имени региона здесь нет намеренно. У коллекции «по регионам» имя, иероглифы
 * и пиньинь дословно совпадают с регионом, и заголовок страницы их уже
 * говорит; в атласе их говорит заголовок карточки. Повторить их значило бы
 * написать имя дважды в сорока пикселях друг от друга.
 */

/**
 * Строка «Источники: ...». Дедупликация — по показанному имени, а не по
 * организации: два подразделения ЮНЕСКО в реестре должны схлопнуться в одно
 * слово.
 */
function factSourcesLine(facts: readonly Fact[]): string | null {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const fact of facts) {
    for (const sourceId of fact.sourceIds) {
      const source = sourceById(sourceId);
      if (source === undefined) {
        continue;
      }
      const label = source.shortLabel ?? source.organization;
      if (!seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    }
  }

  return labels.length === 0 ? null : labels.join(' · ');
}

/**
 * Справка: темы и тела фактов, внизу — строка источников. Блок один для
 * региона и физического объекта (утверждённый макет
 * docs/screens/04-atlas-card-facts-v1.html, вариант А).
 */
export function CardFacts({ facts }: { readonly facts: readonly Fact[] }) {
  if (facts.length === 0) {
    return null;
  }

  const sourcesLine = factSourcesLine(facts);

  return (
    <section className="atlas-facts">
      {/*
        Заголовком, а не надзаголовком-абзацем. Темы фактов ниже — `h3`, и
        пока «Справка» была абзацем, страница шла с `h1` сразу на `h3`: у
        читалки экрана пропадала ступень, а вместе с ней и то, что три темы
        принадлежат одному блоку. Имя блока теперь даёт сам заголовок, поэтому
        `aria-label` убран — он повторял бы его.
      */}
      <h2 className="eyebrow">Справка</h2>
      {facts.map((fact) => (
        <div className="atlas-fact" key={fact.title}>
          <h3>{fact.title}</h3>
          <p>{fact.body}</p>
        </div>
      ))}
      {sourcesLine === null ? null : (
        <p className="atlas-sources">Источники: {sourcesLine}</p>
      )}
    </section>
  );
}

export function RegionReference({ region }: { readonly region: Region }) {
  const capital = cityById(region.capitalCityId);

  return (
    <>
      <p>
        Административный центр: {capital?.nameRu}{' '}
        <span lang="zh-Hans">({capital?.nameZh})</span>
      </p>
      <CardFacts facts={region.facts} />
      {/*
        Города региона перечислены словами, а не только точками на карте:
        точка — не текст, читалке экрана её не прочесть, а делать полсотни
        знаков остановками Tab дороже, чем дать список там, где регион и так
        разглядывают.
      */}
      <ul className="region-city-list">
        {citiesOfRegion(region.id).map((city) => (
          <li key={city.id}>
            {city.nameRu} <span lang="zh-Hans">{city.nameZh}</span>{' '}
            <span lang="zh-Latn-pinyin">{city.pinyin}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
