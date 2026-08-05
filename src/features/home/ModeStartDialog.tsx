import { useEffect, useRef, useState } from 'react';
import type { QuestionLanguage } from '../../domain/question-language';

export type ModeStartDialogProps = {
  readonly title: string;
  /** «34 региона · около 7 минут» — то же, что на карточке. */
  readonly volume: string;
  readonly defaultLanguage: QuestionLanguage;
  readonly onStart: (language: QuestionLanguage) => void;
  readonly onClose: () => void;
};

const LANGUAGES: readonly (readonly [QuestionLanguage, string])[] = [
  ['ru', 'Русское название'],
  ['zh', '中文'],
];

/**
 * Окно перед стартом: чем спрашивать — русским названием или иероглифами.
 *
 * Отдельным окном, а не переключателем на карточке: на карточке он стоял вне
 * кнопки запуска (интерактивный элемент внутри кнопки недостижим с
 * клавиатуры), то есть на доске, а не на бумаге, — тёмное по тёмному. Окно
 * ставит выбор на бумагу и задаёт его один раз, там, где ученик уже решил
 * играть.
 *
 * Родной `<dialog>` взят ради того, чего иначе пришлось бы писать руками:
 * верхний слой, Esc, возврат фокуса и недоступность остальной страницы.
 */
export function ModeStartDialog({
  title,
  volume,
  defaultLanguage,
  onStart,
  onClose,
}: ModeStartDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const [language, setLanguage] = useState<QuestionLanguage>(defaultLanguage);

  useEffect(() => {
    dialogRef.current?.showModal();
    /*
     * Фокус ставится после открытия и явно: `autoFocus` React выставляет
     * свойством, а не атрибутом, и родной `showModal` его не видит — фокус
     * уходил на первую радиокнопку. Обычный случай — просто играть, а язык уже
     * назван выбранной строкой выше.
     */
    startRef.current?.focus();
  }, []);

  return (
    <dialog
      className="mode-dialog"
      ref={dialogRef}
      aria-labelledby="mode-dialog-title"
      onClose={onClose}
      /*
       * Нажатие мимо окна попадает в сам `<dialog>`: его прямоугольник — это
       * подложка во весь экран, а содержимое лежит во вложенном блоке.
       */
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          dialogRef.current?.close();
        }
      }}
    >
      <div className="mode-dialog-body">
        <h2 id="mode-dialog-title">{title}</h2>
        <p className="mode-dialog-volume">{volume}</p>
        <fieldset className="mode-dialog-language">
          <legend>Чем спрашивать</legend>
          {LANGUAGES.map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="mode-dialog-language"
                value={value}
                checked={language === value}
                onChange={() => setLanguage(value)}
              />
              <span lang={value === 'zh' ? 'zh-Hans' : undefined}>{label}</span>
            </label>
          ))}
        </fieldset>
        <div className="mode-dialog-actions">
          <button
            type="button"
            className="primary"
            ref={startRef}
            onClick={() => onStart(language)}
          >
            Начать
          </button>
          <button
            type="button"
            className="text"
            onClick={() => dialogRef.current?.close()}
          >
            Отмена
          </button>
        </div>
      </div>
    </dialog>
  );
}
