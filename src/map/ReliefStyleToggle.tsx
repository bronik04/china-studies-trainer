/**
 * Вид рельефа на физической карте: школьная цветная шкала высот или та же
 * шкала тушью — бумажными тонами от светлого к тёмному.
 *
 * По умолчанию цвет: одноцветный рельеф владелец счёл помехой учёбе —
 * цветная шкала та, по которой карту читают в учебнике (DECISIONS.md,
 * 2026-10-14). Тушь — для тех, кому цвет мешает разглядеть реки.
 *
 * Вид — свойство показа, а не карты: `ChinaMap` о нём не знает, его читает CSS
 * по `data-relief` на обёртке (`.relief-ink` в styles.css).
 */
export type ReliefStyle = 'color' | 'ink';

export type ReliefStyleToggleProps = {
  readonly value: ReliefStyle;
  readonly onChange: (value: ReliefStyle) => void;
  /** Имя группы радиокнопок: на экране может стоять не один переключатель. */
  readonly name: string;
};

const OPTIONS: readonly (readonly [ReliefStyle, string])[] = [
  ['color', 'В цвете'],
  ['ink', 'Тушью'],
];

export function ReliefStyleToggle({ value, onChange, name }: ReliefStyleToggleProps) {
  return (
    <fieldset className="relief-toggle">
      <legend>Рельеф</legend>
      <span className="relief-toggle-options">
        {OPTIONS.map(([option, label]) => (
          <label key={option}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {/* Образец шкалы — три полосы того вида, который выбирают. */}
            <span className="relief-toggle-sample" data-relief={option} aria-hidden="true">
              <span data-band="0" />
              <span data-band="1000" />
              <span data-band="4000" />
            </span>
            {label}
          </label>
        ))}
      </span>
    </fieldset>
  );
}
