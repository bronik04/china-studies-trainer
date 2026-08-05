import { useEffect, useRef, useState } from 'react';
import { citiesUpTo } from '../../content/cities';
import { citiesWord } from '../../content/region-count';
import type { CitySet } from '../../content/types';
import type { QuestionLanguage } from '../../domain/question-language';

export type ModeStartDialogProps = {
  readonly title: string;
  /** «34 региона · около 7 минут» — то же, что на карточке. */
  readonly volume: string;
  readonly defaultLanguage: QuestionLanguage;
  /** Задан — игра по городам: в окне появляется выбор набора. */
  readonly defaultCitySet?: CitySet | null;
  readonly onStart: (language: QuestionLanguage, citySet: CitySet) => void;
  readonly onClose: () => void;
};

const LANGUAGES: readonly (readonly [QuestionLanguage, string])[] = [
  ['ru', 'Русское название'],
  ['zh', '中文'],
];

/**
 * Наборы вложены: значимые включают столицы, приграничные — и то и другое.
 * Ученик выбирает, докуда, а не какой один. Числа берутся из каталога, а не
 * пишутся руками, — иначе они разойдутся с ним при первом же новом городе.
 */
const CITY_SETS: readonly (readonly [CitySet, string])[] = [
  ['capital', 'Только центры регионов'],
  ['notable', 'И значимые города'],
  ['border', 'И приграничные с Россией'],
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
  defaultCitySet = null,
  onStart,
  onClose,
}: ModeStartDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const [language, setLanguage] = useState<QuestionLanguage>(defaultLanguage);
  const [citySet, setCitySet] = useState<CitySet>(defaultCitySet ?? 'capital');

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
        {defaultCitySet === null ? null : (
          <fieldset className="mode-dialog-language">
            <legend>Какие города</legend>
            {CITY_SETS.map(([value, label]) => {
              const count = citiesUpTo(value).length;

              return (
                <label key={value}>
                  <input
                    type="radio"
                    name="mode-dialog-city-set"
                    value={value}
                    checked={citySet === value}
                    onChange={() => setCitySet(value)}
                  />
                  <span>
                    {label} — {count} {citiesWord(count)}
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}
        <div className="mode-dialog-actions">
          <button
            type="button"
            className="primary"
            ref={startRef}
            onClick={() => onStart(language, citySet)}
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
