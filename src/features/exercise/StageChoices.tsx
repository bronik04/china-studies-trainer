import { useEffect, type MouseEvent } from 'react';

export type StageChoice = {
  readonly id: string;
  readonly label: string;
  /** Язык подписи, когда он не русский: иероглифы объявляются китайскими. */
  readonly lang?: string;
  readonly result?: 'correct' | 'incorrect';
};

export type StageChoicesProps = {
  readonly choices: readonly StageChoice[];
  readonly disabled: boolean;
  readonly onChoose: (choiceId: string) => void;
};

/**
 * Полоса вариантов под картой: тёмные кнопки с ярлыками клавиш «1»–«4»
 * (спек RoundStage). Ответ нажимается и цифрой с клавиатуры — ярлык на кнопке
 * называет клавишу.
 *
 * Слушатель живёт на документе, пока полоса включена: фокус во время игры
 * гуляет между картой и кнопками, и вешать его на саму полосу значило бы
 * требовать фокус в ней. Полей ввода на экране раунда нет, перехватывать
 * цифры не у кого.
 */
export function StageChoices({ choices, disabled, onChoose }: StageChoicesProps) {
  useEffect(() => {
    if (disabled) {
      return;
    }

    function handleKey(event: KeyboardEvent) {
      // Cmd+1/Ctrl+1/Alt+1 переключают вкладки браузера — это не ответ.
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const index = Number.parseInt(event.key, 10) - 1;
      const choice = Number.isNaN(index) ? undefined : choices[index];
      if (choice !== undefined) {
        onChoose(choice.id);
      }
    }

    document.addEventListener('keydown', handleKey);

    return () => document.removeEventListener('keydown', handleKey);
  }, [choices, disabled, onChoose]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const choiceId = event.currentTarget.dataset.choiceId ?? '';
    if (choiceId !== '') {
      onChoose(choiceId);
    }
  }

  return (
    <ul className="stage-choices" aria-label="Варианты ответа">
      {choices.map((choice, index) => (
        <li key={choice.id}>
          <button
            type="button"
            data-testid="choice-option"
            data-choice-id={choice.id}
            data-result={choice.result}
            disabled={disabled}
            aria-keyshortcuts={String(index + 1)}
            onClick={handleClick}
          >
            <kbd aria-hidden="true">{index + 1}</kbd>
            <span lang={choice.lang}>{choice.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
