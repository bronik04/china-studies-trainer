/**
 * Заливки-штриховки для карты.
 *
 * Разметка карты подставляется через `dangerouslySetInnerHTML`, поэтому
 * добавить `<defs>` внутрь неё компонентом нельзя. Ссылка `url(#id)`
 * разрешается в пределах документа, так что образец объявляется отдельным
 * скрытым `svg` — сам файл карты остаётся нетронутым.
 */
/*
 * Идентификаторы образцов. Не экспортируются: ссылается на них только
 * `src/styles.css` литералами `url('#...')`, а импортировать их оттуда нельзя.
 * Переименование правится в двух местах — других потребителей нет.
 */
const INCORRECT_PATTERN_ID = 'map-hatch-incorrect';
const SECOND_TRY_PATTERN_ID = 'map-hatch-second-try';
const FAILED_PATTERN_ID = 'map-hatch-failed';
const IN_PROGRESS_PATTERN_ID = 'map-hatch-in-progress';
const PHYSICAL_CORRECT_PATTERN_ID = 'map-hatch-physical-correct';
const PHYSICAL_INCORRECT_PATTERN_ID = 'map-hatch-physical-incorrect';
const PHYSICAL_HIGHLIGHT_PATTERN_ID = 'map-hatch-physical-highlight';
const DISPUTED_PATTERN_ID = 'map-hatch-disputed';

export function MapDefs() {
  return (
    <svg
      className="map-defs"
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
    >
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
        {/*
          Три исхода не могут попарно давать 3:1 — окно светлоты слишком узкое
          (см. tokens.css). Поэтому исход несёт второй канал: сплошная заливка,
          редкая штриховка, частая штриховка. Различие читается в оттенках
          серого, при дальтонизме и на печати.
        */}
        <pattern
          id={SECOND_TRY_PATTERN_ID}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" fill="var(--map-second-try)" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="var(--map-outcome-ink)"
            strokeWidth="1.5"
          />
        </pattern>
        <pattern
          id={FAILED_PATTERN_ID}
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="4" height="4" fill="var(--map-failed)" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="4"
            stroke="var(--map-outcome-ink)"
            strokeWidth="1.5"
          />
        </pattern>
        {/*
          Регион в работе на карте освоенности. Шаг тот же, что у «верно со
          второй попытки», но земля своя: там амбра исхода, здесь охра работы.
          Образцы делят геометрию, а не заливку, поэтому образец отдельный.
        */}
        <pattern
          id={IN_PROGRESS_PATTERN_ID}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" fill="var(--map-progress-in-progress)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--map-border)" strokeWidth="1" />
        </pattern>
        {/*
          Исход на физической карте. Фона у образца нет намеренно: под ним
          лежит копия того же контура со своей ступенью, и она обязана
          просвечивать — перекрасить форму значило бы соврать про её высоту.
          Различают исходы наклон и частота штриха, а не только цвет: пара
          «верно — неверно» одной светлоты неразличима при дальтонизме, а
          здесь оба тона ещё и тёмные, потому что светлее им нельзя (см.
          `--map-correct-mark` в tokens.css).
        */}
        <pattern
          id={PHYSICAL_CORRECT_PATTERN_ID}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="var(--map-correct-mark)"
            strokeWidth="2"
          />
        </pattern>
        <pattern
          id={PHYSICAL_INCORRECT_PATTERN_ID}
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="4"
            stroke="var(--map-incorrect-mark-relief)"
            strokeWidth="2"
          />
        </pattern>
        {/*
          Выделение формы рельефа: что под курсором, что в фокусе, что
          спрошено. Фона у образца нет — под ним лежит полоса высоты, и она
          обязана просвечивать между штрихами: выделение говорит «вот этот
          объект», а не «вот эта высота».

          Штрих вертикальный, тогда как у исходов 45° и минус 45°: форма под
          курсором и форма с исходом бывают на экране рядом, и три вида
          штриховки должны различаться наклоном, а не только тоном.

          Шаг и толщина заданы от экрана, а не на глаз: при ширине карты
          542 px единица viewBox — 0.672 px, и штрих в 1.2 единицы давал
          0.81 px. Линия тоньше пикселя не рисуется штрихом — сглаживание
          размазывает её в ровную серую заливку, и штриховка перестаёт
          читаться штриховкой. Полтора на девять дают ровно 1 px через 6 px
          при той же доле туши.
        */}
        <pattern
          id={PHYSICAL_HIGHLIGHT_PATTERN_ID}
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="9"
            stroke="var(--map-highlight)"
            strokeWidth="1.5"
          />
        </pattern>
        {/*
          Спорный участок границы. Фона у образца нет намеренно: под ним лежит
          страна или область со своей заливкой, и она обязана просвечивать —
          иначе штриховка не отмечает спор, а перекрашивает страну и прячет
          исход ответа под собой.

          Тушь нейтральная, а не из палитры исходов: спор — свойство участка, а
          не оценка ответа. Наклон минус 45° против 45° у образца ошибки —
          верная и спорная отметки бывают на экране разом и обязаны различаться
          не только тоном.
        */}
        <pattern
          id={DISPUTED_PATTERN_ID}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke="var(--map-border)"
            strokeWidth="1.5"
          />
        </pattern>
      </defs>
    </svg>
  );
}
