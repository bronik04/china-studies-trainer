import { useState, type ReactNode } from 'react';
import type { Region } from '../../content/types';
import type { ExerciseType, Level } from '../../domain/round';
import { EXERCISE_MODES } from '../exercise/exercise-modes';

/** «mixed» — смешанный раунд четвёртого уровня, где типы заданий чередуются. */
export type RoundRequest = ExerciseType | 'mixed';

type TopicSelectionPageProps = {
  readonly regions: readonly Region[];
  readonly children?: ReactNode;
  readonly unlockedLevel?: Level;
  readonly onStartRound?: (request: RoundRequest, level: Level) => void;
};

const ALL_LEVELS = [1, 2, 3, 4] as const;

export function TopicSelectionPage({
  regions,
  children,
  unlockedLevel = 1,
  onStartRound,
}: TopicSelectionPageProps) {
  const [level, setLevel] = useState<Level>(1);
  const levels = ALL_LEVELS.filter((value) => value <= unlockedLevel);
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
          <>
            <fieldset className="level-choice">
              <legend>Уровень</legend>
              {levels.map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="level"
                    checked={level === value}
                    onChange={() => setLevel(value)}
                  />
                  Уровень {value}
                </label>
              ))}
            </fieldset>
            <div className="mode-actions">
              {level === 4 ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => onStartRound('mixed', level)}
                >
                  Смешанный раунд
                </button>
              ) : (
                Object.values(EXERCISE_MODES).map((mode) => (
                  <button
                    key={mode.exerciseType}
                    type="button"
                    className="primary"
                    onClick={() => onStartRound(mode.exerciseType, level)}
                  >
                    {mode.title}
                  </button>
                ))
              )}
            </div>
          </>
        ) : null}
      </header>
      {children}
      <section aria-labelledby="regions-heading">
        <div className="section-heading">
          <h2 id="regions-heading">Регионы</h2>
          <p>34 региона</p>
        </div>
        <p className="status-note">
          Текстовый справочник сохраняет все формы названий и центры регионов.
        </p>
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
