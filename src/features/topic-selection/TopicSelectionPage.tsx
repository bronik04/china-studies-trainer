import type { ReactNode } from 'react';
import type { Region } from '../../content/types';

type TopicSelectionPageProps = {
  readonly regions: readonly Region[];
  readonly children?: ReactNode;
  readonly onStartRound?: () => void;
};

export function TopicSelectionPage({
  regions,
  children,
  onStartRound,
}: TopicSelectionPageProps) {
  const orderedRegions = [...regions].sort((left, right) =>
    left.nameRu.localeCompare(right.nameRu, 'ru'),
  );

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Тема</p>
        <h1>Провинции и столицы Китая</h1>
        <p>Познакомьтесь с регионами до первого тренировочного раунда.</p>
        {onStartRound ? (
          <button type="button" className="primary" onClick={onStartRound}>
            Начать раунд
          </button>
        ) : null}
      </header>
      {children}
      <section aria-labelledby="regions-heading">
        <div className="section-heading">
          <h2 id="regions-heading">Регионы</h2>
          <p>34 региона</p>
        </div>
        <p className="status-note">Текстовый справочник сохраняет все формы названий и центры регионов.</p>
        <ul className="region-list" aria-label="Текстовый список регионов">
          {orderedRegions.map((region) => (
            <li key={region.id} aria-label={region.nameRu}>
              <article className="region-card">
                <h3>
                  {region.nameRu} <span lang="zh-Hans">{region.nameZh}</span>
                </h3>
                <p lang="zh-Latn-pinyin">{region.pinyin}</p>
                <p>
                  Административный центр: {region.capitalRu}{' '}
                  <span lang="zh-Hans">({region.capitalZh})</span>
                </p>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
