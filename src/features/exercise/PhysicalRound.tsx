import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { regions } from '../../content/regions';
import type { PhysicalFeature } from '../../content/types';
import { buildPhysicalChoices } from '../../domain/physical-choices';
import { labelOf, langOf, type QuestionLanguage } from '../../domain/question-language';
import { createSeededRandom } from '../../domain/random';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  physicalTarget,
  type Attempt,
  type Round,
} from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import type { MapZoom } from '../../map/MapControls';
import type { FeatureOutcome } from '../../map/PhysicalLayer';
import { PHYSICAL_MODES } from './exercise-modes';
import { PhysicalAnswerList } from './PhysicalAnswerList';
import { RoundProgressTrail } from './RoundProgressTrail';

/** Столько же, сколько в раундах по регионам и городам: ритм у игр общий. */
const CORRECT_PAUSE_MS = 500;

/*
 * Часы раунда живут в модуле, а не в теле компонента. `performance.now`
 * нечист, и проверка чистоты React считает его вызов внутри компонента
 * вызовом во время отрисовки, хотя оба вызова происходят в обработчиках
 * событий. Тот же приём в `CityRound`.
 */
function startClock(): number {
  return performance.now();
}

function elapsedSince(start: number): number {
  return Math.round(startClock() - start);
}

export type PhysicalRoundProps = {
  readonly features: readonly PhysicalFeature[];
  readonly exerciseType: 'find-on-map' | 'name-target';
  readonly language: QuestionLanguage;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};

/**
 * Две игры по физической географии одним экраном.
 *
 * Отдельно от `CityRound` и `ExerciseRound` по той же причине, по которой они
 * отдельны друг от друга: другой ответ (река разрешается расстоянием, форма —
 * контуром), другие отвлекающие (того же вида, а не того же типа единицы) и
 * свои состояния карты, где цвет занят ступенями.
 *
 * | Игра | Вопрос | Ответ |
 * | --- | --- | --- |
 * | `find-on-map` | имя объекта | нажатие по реке или форме |
 * | `name-target` | подсвеченный объект | одно из четырёх имён |
 *
 * Раунд один на двенадцать целей, реки и формы вперемешку: разделять их на
 * два раунда по шесть значило бы разорвать ту самую связь между рельефом и
 * течением рек, ради которой режим и делается.
 */
export function PhysicalRound({
  features,
  exerciseType,
  language,
  roundId,
  seed,
  onFinish,
  onExit,
}: PhysicalRoundProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(
      features.map((feature) => physicalTarget(feature.id)),
      {
        roundId,
        exerciseTypes: [exerciseType],
        language,
        random: createSeededRandom(seed),
      },
    ),
  );
  /*
   * Увеличение с панорамированием: на участке параллельных рек — Цзиньша,
   * Ланьцан и Ну идут рядом полтысячи километров — показать Янцзы, не рискуя
   * попасть в Ланьцанцзян, можно только увеличив карту.
   */
  const [zoom, setZoom] = useState<MapZoom>(1);
  const [answeredId, setAnsweredId] = useState<string | null>(null);
  const [askedAt, setAskedAt] = useState(startClock);
  const advanceTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
      }
    },
    [],
  );

  const choicesByQuestion = useMemo(() => {
    const random = createSeededRandom(seed + 1);

    return round.questions.map((question) =>
      buildPhysicalChoices(features, question.target.id, random),
    );
  }, [features, round.questions, seed]);

  const question = currentQuestion(round);
  const targetFeature = features.find((feature) => feature.id === question.target.id)!;
  const mode = PHYSICAL_MODES[exerciseType];
  const isLastQuestion = round.currentIndex === round.questions.length - 1;
  const lastAttempt = round.attempts[round.attempts.length - 1];
  const showsFeedback = round.status === 'feedback' && lastAttempt?.isCorrect === false;
  const showsChoices = exerciseType === 'name-target';

  /*
   * Исход показывается на самой карте: после ответа видно и то, что выбрал
   * ученик, и то, где был правильный объект. До ответа помечать нечего.
   */
  const featureOutcomes = useMemo(() => {
    if (answeredId === null) {
      return {};
    }

    const outcomes: Record<string, FeatureOutcome> = {
      [targetFeature.id]: 'correct',
    };
    if (answeredId !== targetFeature.id) {
      outcomes[answeredId] = 'incorrect';
    }

    return outcomes;
  }, [answeredId, targetFeature.id]);

  function goNext(from: Round) {
    const next = goToNextQuestion(from);
    if (isRoundFinished(next)) {
      onFinish(next.attempts);
      return;
    }

    setRound(next);
    setAnsweredId(null);
    setAskedAt(startClock());
  }

  function answer(id: string) {
    if (round.status !== 'ready') {
      return;
    }

    setAnsweredId(id);
    const answered = answerQuestion(round, {
      answeredId: id,
      durationMs: elapsedSince(askedAt),
      answeredAt: new Date().toISOString(),
    });
    setRound(answered);

    if (answered.attempts[answered.attempts.length - 1].isCorrect) {
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null;
        goNext(answered);
      }, CORRECT_PAUSE_MS);
    }
  }

  function handleChoice(event: MouseEvent<HTMLButtonElement>) {
    answer(event.currentTarget.dataset.choiceId ?? '');
  }

  /*
   * Обработчики объявлены именами, а не стрелками прямо в разметке: стрелка в
   * свойстве JSX создаётся на рендере, и проверка чистоты считает вызов из неё
   * вызовом во время отрисовки. Тот же приём в `CityRound`.
   */
  function handleFeatureSelect(featureId: string) {
    if (!showsChoices) {
      answer(featureId);
    }
  }

  function handleNext() {
    goNext(round);
  }

  return (
    <main className="round-shell">
      <div className="round-layout" data-columns="two">
        <div className="round-prompt-column">
          <header className="round-prompt">
            <p className="eyebrow">{mode.eyebrow}</p>
            <h1
              data-testid="exercise-target"
              lang={showsChoices ? undefined : langOf(question.language)}
            >
              {showsChoices
                ? 'Объект на карте'
                : labelOf(targetFeature, question.language)}
            </h1>
            <p className="exercise-progress">
              Вопрос {round.currentIndex + 1} из {round.questions.length}
            </p>
          </header>
          {showsChoices ? (
            <ul className="choice-list" aria-label="Варианты ответа">
              {choicesByQuestion[round.currentIndex].map((choice) => (
                <li key={choice.id}>
                  <button
                    type="button"
                    data-testid="choice-option"
                    data-choice-id={choice.id}
                    data-result={
                      answeredId === null
                        ? undefined
                        : choice.id === targetFeature.id
                          ? 'correct'
                          : choice.id === answeredId
                            ? 'incorrect'
                            : undefined
                    }
                    disabled={round.status !== 'ready'}
                    onClick={handleChoice}
                  >
                    {labelOf(choice, question.language)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {showsFeedback ? (
            <section
              className="answer-feedback"
              data-result="incorrect"
              aria-labelledby="physical-feedback-heading"
            >
              <p className="answer-feedback-icon" role="img" aria-label="Стоит повторить">
                ↻
              </p>
              <h3 id="physical-feedback-heading" tabIndex={-1}>
                Этот объект стоит повторить
              </h3>
              <p>
                Правильный ответ: {targetFeature.nameRu}{' '}
                <span lang="zh-Hans">{targetFeature.nameZh}</span>.
              </p>
              <button type="button" className="primary" onClick={handleNext}>
                {isLastQuestion ? 'Завершить раунд' : 'Далее'}
              </button>
            </section>
          ) : null}
          <RoundProgressTrail total={round.questions.length} attempts={round.attempts} />
        </div>
        <div className="round-map">
          {/*
            Подписи скрыты в обеих играх: в «назвать объект» подпись
            подсвеченной реки и есть ответ, в «найти» она выдала бы объект
            наведением курсора. Та же утечка, что у выносок Макао и Гонконга.
            Области при этом не отвечают: ответ здесь — объект, а не регион.
          */}
          <ChinaMap
            regions={regions}
            selectedRegionId={null}
            onSelect={() => {}}
            onClear={() => {}}
            interactive={false}
            zoom={zoom}
            onZoomChange={setZoom}
            usage="answer"
            variant="physical"
            selectedFeatureId={showsChoices ? targetFeature.id : answeredId}
            onSelectFeature={showsChoices ? undefined : handleFeatureSelect}
            showsPhysicalLabels={false}
            featureOutcomes={featureOutcomes}
          />
        </div>
      </div>
      {/*
        Равнозначный список: река шириной в волос не цель ни при каком
        разведении на 320 px, и с клавиатуры карта отвечает не всем.
      */}
      {exerciseType === 'find-on-map' ? (
        <PhysicalAnswerList
          features={features}
          language={question.language}
          answeredId={answeredId}
          targetId={targetFeature.id}
          disabled={round.status !== 'ready'}
          onSelect={handleFeatureSelect}
        />
      ) : null}
      <footer className="round-footer">
        <button type="button" className="secondary" onClick={onExit}>
          Прервать раунд
        </button>
      </footer>
    </main>
  );
}
