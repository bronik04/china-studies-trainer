/**
 * Заливки-штриховки для карты.
 *
 * Разметка карты подставляется через `dangerouslySetInnerHTML`, поэтому
 * добавить `<defs>` внутрь неё компонентом нельзя. Ссылка `url(#id)`
 * разрешается в пределах документа, так что образец объявляется отдельным
 * скрытым `svg` — сам файл карты остаётся нетронутым.
 */
export const INCORRECT_PATTERN_ID = 'map-hatch-incorrect';

export function MapDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        {/*
          Ошибка помечается штриховкой, а не другим цветом заливки: пара
          «зелёный — красный» одной светлоты неразличима при дальтонизме, а
          разные виды отметки читаются даже в оттенках серого.

          Фон образца — тон закрытой области: после ответа карта закрыта
          целиком, и штриховка ложится на тот же тон, что и у соседей.
        */}
        <pattern
          id={INCORRECT_PATTERN_ID}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill="var(--map-locked)" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke="var(--map-incorrect-mark)"
            strokeWidth="3"
          />
        </pattern>
      </defs>
    </svg>
  );
}
