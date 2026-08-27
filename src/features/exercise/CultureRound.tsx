import { useMemo, useState } from 'react';
import type { Collection } from '../../content/collections';
import { sameKindAs } from '../../content/culture-sets';
import { buildCultureChoices } from '../../domain/culture-choices';
import {
  labelOf,
  langOf,
  type QuestionLanguage,
} from '../../domain/question-language';
import { createSeededRandom } from '../../domain/random';
import {
  answerQuestion,
  collectionTarget,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  type Attempt,
  type Round,
} from '../../domain/round';
import { CollectionImage } from '../../ui/CollectionImage';
import { CULTURE_MODE } from './exercise-modes';
import { RoundProgressTrail } from './RoundProgressTrail';
import { RoundStage } from './RoundStage';
import { StageChoices, type StageChoice } from './StageChoices';
import { useAutoAdvance } from './use-auto-advance';

/*
 * Часы раунда живут в модуле, а не в теле компонента: `performance.now`
 * нечист, и проверка чистоты React считает его вызов внутри компонента
 * вызовом во время отрисовки. Тот же приём в остальных играх.
 */
function startClock(): number {
  return performance.now();
}

export type CultureRoundProps = {
  readonly collections: readonly Collection[];
  readonly language: QuestionLanguage;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};

/**
 * «Культура: узнать по фотографии».
 *
 * Единственная игра, где вопрос — не слово и не место на карте, а сам снимок.
 * Поэтому и кадр устроен иначе: карты нет, её место занимает фотография во всю
 * ширину, а четыре названия стоят полосой под ней, как в остальных играх.
 *
 * Подпись под кадром снята намеренно — она называет то, что спрашивают. Автор
 * и лицензия названы на странице коллекции, куда ведёт итог раунда; лицензия
 * такой способ признаёт.
 */
export function CultureRound({
  collections,
  language,
  roundId,
  seed,
  onFinish,
  onExit,
}: CultureRoundProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(
      collections.map((collection) => collectionTarget(collection.id)),
      {
        roundId,
        exerciseTypes: ['name-target'],
        language,
        random: createSeededRandom(seed),
      },
    ),
  );
  const [answeredId, setAnsweredId] = useState<string | null>(null);
  const [startedAt] = useState(startClock);
  const [askedAt, setAskedAt] = useState(startClock);
  const { schedule } = useAutoAdvance();

  const question = currentQuestion(round);
  const byId = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection])),
    [collections],
  );
  const target = byId.get(question.target.id)!;

  /*
   * Варианты считаются один раз на весь раунд: пересчёт на каждый рендер
   * тасовал бы кнопки под рукой ученика.
   */
  const choicesByQuestion = useMemo(() => {
    const random = createSeededRandom(seed + 1);

    return round.questions.map((item) => {
      const asked = byId.get(item.target.id)!;

      return buildCultureChoices(asked, sameKindAs(asked), collections, random);
    });
  }, [round.questions, byId, collections, seed]);

  const lastAttempt = round.attempts[round.attempts.length - 1];
  const showsAnswer =
    round.status === 'feedback' && lastAttempt?.isCorrect === false;

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

  function answer(collectionId: string) {
    if (round.status !== 'ready') {
      return;
    }

    setAnsweredId(collectionId);
    const answered = answerQuestion(round, {
      answeredId: collectionId,
      durationMs: Math.round(startClock() - askedAt),
      answeredAt: new Date().toISOString(),
    });
    setRound(answered);

    const isCorrect = answered.attempts[answered.attempts.length - 1].isCorrect;
    schedule(isCorrect, () => goNext(answered));
  }

  /* Исход виден у нажатой кнопки и у верной: подсвечивать все четыре — значит ответить за ученика. */
  function resultOf(choiceId: string): StageChoice['result'] {
    if (answeredId === null) {
      return undefined;
    }

    if (choiceId === target.id) {
      return 'correct';
    }

    return choiceId === answeredId ? 'incorrect' : undefined;
  }

  const choices: readonly StageChoice[] = choicesByQuestion[
    round.currentIndex
  ].map((choice) => ({
    id: choice.id,
    label: labelOf(choice, language),
    lang: langOf(language),
    result: resultOf(choice.id),
  }));

  const prompt = showsAnswer ? (
    <>
      <p className="eyebrow">Это стоит повторить</p>
      <h1 className="stage-target" data-testid="exercise-target">
        <span lang={langOf(language)}>{labelOf(target, language)}</span>
        {/*
          Где это увидят — вторая половина обещания карточки. Названием
          региона, а не картой: карта здесь не показана, и указывать на
          невидимое нечем.
        */}
        {target.scopeLabel === undefined ? null : (
          <span className="stage-hint"> · {target.scopeLabel}</span>
        )}
      </h1>
    </>
  ) : (
    <>
      <p className="eyebrow">{CULTURE_MODE.eyebrow}</p>
      <h1 className="stage-target" data-testid="exercise-target">
        Что на снимке
      </h1>
    </>
  );

  return (
    <RoundStage
      prompt={prompt}
      promptState={showsAnswer ? 'answer' : 'question'}
      startedAt={startedAt}
      progress={
        <>
          <p className="exercise-progress">
            Вопрос {round.currentIndex + 1} из {round.questions.length}
          </p>
          <RoundProgressTrail
            total={round.questions.length}
            attempts={round.attempts}
          />
        </>
      }
      choices={
        <StageChoices
          choices={choices}
          disabled={round.status !== 'ready'}
          onChoose={answer}
        />
      }
      onExit={onExit}
    >
      <div className="culture-stage">
        {/*
          Снимок без подписи об авторе: подпись называет место и тем отвечает
          на вопрос. Автор назван на странице коллекции, куда ведёт итог.

          Ключ по вопросу заставляет React заменить узел, а не переиспользовать
          его: без него браузер оставлял бы прежний кадр видимым, пока грузится
          следующий, и ученик отвечал бы на предыдущий вопрос.
        */}
        <CollectionImage
          key={question.id}
          photo={target.photos[0]}
          height="stage"
          sizes="100vw"
          credited={false}
        />
        {round.status === 'feedback' ? (
          <p className="culture-note">{target.lead}</p>
        ) : null}
      </div>
    </RoundStage>
  );
}
