import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { Region } from '../../content/types';
import { buildChoices } from '../../domain/choices';
import { createSeededRandom } from '../../domain/random';
import { labelOf, langOf, type QuestionLanguage } from '../../domain/question-language';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  regionTarget,
  type Attempt,
  type ExerciseType,
  type Round,
} from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { MapAttribution } from '../../map/MapAttribution';
import { RegionAnswerList } from '../../map/RegionAnswerList';
import { AnswerFeedback } from './AnswerFeedback';
import { answerStatesFor } from './answer-states';
import { EXERCISE_MODES } from './exercise-modes';
import { RoundProgressTrail } from './RoundProgressTrail';

export type ExerciseRoundProps = {
  readonly regions: readonly Region[];
  readonly exerciseTypes: readonly ExerciseType[];
  readonly language: QuestionLanguage;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};

function resultOf(
  choiceId: string,
  targetId: string,
  answeredRegionId: string | null,
): 'correct' | 'incorrect' | undefined {
  if (answeredRegionId === null) {
    return undefined;
  }

  if (choiceId === targetId) {
    return 'correct';
  }

  return choiceId === answeredRegionId ? 'incorrect' : undefined;
}

/**
 * Сколько верный ответ виден до следующего вопроса. Без паузы регион
 * закрашивается и исчезает раньше, чем глаз это заметит; с кнопкой «Далее»
 * ученик подтверждал то, что и так знает. В «Заполни карту» той же цели
 * служат полторы секунды показа неугаданного региона — здесь хватает
 * меньшего, потому что подтверждается успех, а не сообщается новое.
 */
const CORRECT_PAUSE_MS = 500;

/**
 * Один контейнер на все задания: типы могут чередоваться внутри раунда,
 * поэтому вид вопроса решается на каждом вопросе, а не на экране.
 */
export function ExerciseRound({
  regions,
  exerciseTypes,
  language,
  roundId,
  seed,
  onFinish,
  onExit,
}: ExerciseRoundProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(
      regions.map((region) => regionTarget(region.id)),
      {
        roundId,
        exerciseTypes,
        language,
        random: createSeededRandom(seed),
      },
    ),
  );
  const [answeredRegionId, setAnsweredRegionId] = useState<string | null>(null);
  const [askedAt, setAskedAt] = useState(() => performance.now());

  /*
   * Таймер живёт в ссылке: уход с экрана посреди паузы не должен переводить
   * раунд, которого уже нет.
   */
  const advanceTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
      }
    },
    [],
  );

  // Варианты считаются один раз на раунд: иначе перерисовка тасовала бы их
  // прямо под курсором.
  const choicesByQuestion = useMemo(() => {
    const random = createSeededRandom(seed + 1);

    return round.questions.map((question) =>
      buildChoices(regions, question.target.id, random),
    );
  }, [regions, round.questions, seed]);

  const question = currentQuestion(round);
  const targetRegion = regions.find((region) => region.id === question.target.id)!;
  const mode = EXERCISE_MODES[question.exerciseType];
  const isMapAnswer = question.exerciseType === 'find-on-map';
  const showsMap = isMapAnswer || question.exerciseType === 'name-target';
  const isLastQuestion = round.currentIndex === round.questions.length - 1;
  const lastAttempt = round.attempts[round.attempts.length - 1];
  const showsFeedback = round.status === 'feedback' && lastAttempt?.isCorrect === false;

  const answerStates = useMemo(
    () =>
      isMapAnswer ? answerStatesFor(regions, question.target.id, answeredRegionId) : {},
    [isMapAnswer, regions, question.target.id, answeredRegionId],
  );

  function goNext(from: Round) {
    const next = goToNextQuestion(from);
    if (isRoundFinished(next)) {
      onFinish(next.attempts);
      return;
    }

    setRound(next);
    setAnsweredRegionId(null);
    setAskedAt(performance.now());
  }

  function answer(regionId: string) {
    setAnsweredRegionId(regionId);
    const answered = answerQuestion(round, {
      answeredId: regionId,
      durationMs: Math.round(performance.now() - askedAt),
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

  function handleMapSelect(regionId: string) {
    if (round.status === 'ready') {
      answer(regionId);
    }
  }

  function handleChoice(event: MouseEvent<HTMLButtonElement>) {
    const regionId = event.currentTarget.dataset.choiceId ?? '';
    if (round.status === 'ready' && regionId !== '') {
      answer(regionId);
    }
  }

  function handleNext() {
    goNext(round);
  }

  return (
    <main className="round-shell">
      <div className="round-layout" data-columns={showsMap ? 'two' : 'one'}>
        <div className="round-prompt-column">
          <header className="round-prompt">
            <p className="eyebrow">{mode.eyebrow}</p>
            <h1
              data-testid="exercise-target"
              lang={
                question.exerciseType === 'name-target'
                  ? undefined
                  : langOf(question.language)
              }
            >
              {question.exerciseType === 'name-target'
                ? 'Регион на карте'
                : labelOf(targetRegion, question.language)}
            </h1>
            {/*
              Номера уровня здесь больше нет: уровней в продукте не существует,
              игры равноправны и открыты все сразу. Ход раунда — это «сколько
              из скольких», и число уровня рядом с ним ничего не сообщало.
            */}
            <p className="exercise-progress">
              Вопрос {round.currentIndex + 1} из {round.questions.length}
            </p>
          </header>
          {isMapAnswer ? null : (
            <ul className="choice-list" aria-label="Варианты ответа">
              {choicesByQuestion[round.currentIndex].map((choice) => (
                <li key={choice.id}>
                  <button
                    type="button"
                    data-testid="choice-option"
                    data-choice-id={choice.id}
                    data-result={resultOf(
                      choice.id,
                      question.target.id,
                      answeredRegionId,
                    )}
                    disabled={round.status !== 'ready'}
                    onClick={handleChoice}
                  >
                    {question.exerciseType === 'match-pair'
                      ? choice.capitalRu
                      : labelOf(choice, question.language)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showsFeedback ? (
            <AnswerFeedback
              targetRegion={targetRegion}
              isLastQuestion={isLastQuestion}
              onNext={handleNext}
            />
          ) : null}
          <RoundProgressTrail
            total={round.questions.length}
            attempts={round.attempts}
          />
        </div>
        {showsMap ? (
          <div className="round-map">
            <ChinaMap
              regions={regions}
              selectedRegionId={isMapAnswer ? answeredRegionId : question.target.id}
              onSelect={handleMapSelect}
              onClear={() => {}}
              answerStates={answerStates}
              interactive={isMapAnswer}
              usage="answer"
            />
          </div>
        ) : null}
      </div>
      {isMapAnswer ? (
        <RegionAnswerList
          presentation="disclosure"
          regions={regions}
          selectedRegionId={answeredRegionId}
          onSelect={handleMapSelect}
          answerStates={answerStates}
        />
      ) : null}
      <footer className="round-footer">
        <button type="button" className="secondary" onClick={onExit}>
          Прервать раунд
        </button>
        {showsMap ? <MapAttribution /> : null}
      </footer>
    </main>
  );
}
