import type { ReactNode } from 'react';
import type { Region } from '../../content/types';
import type { ExerciseType } from '../../domain/round';
import { EXERCISE_MODES } from '../exercise/exercise-modes';

type TopicSelectionPageProps = {
  readonly regions: readonly Region[];
  readonly children?: ReactNode;
  readonly onStartRound?: (exerciseType: ExerciseType) => void;
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
          <div className="mode-actions">
            {Object.values(EXERCISE_MODES).map((mode) => (
              <button
                key={mode.exerciseType}
                type="button"
                className="primary"
                onClick={() => onStartRound(mode.exerciseType)}
              >
                {mode.title}
              </button>
            ))}
          </div>
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
