/**
 * Контракт дизайн-системы. Каждая пара, от которой зависит понимание
 * интерфейса, проверена по WCAG 2.2. Тест падает, если палитру ухудшили.
 *
 * Проверяются только пары, которые реально встречаются на экране: контраст
 * двух цветов, никогда не оказывающихся рядом, ничего не значит.
 */
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GRAPHIC_CONTRAST,
  TEXT_CONTRAST,
  contrastRatioRounded,
} from '../src/design/contrast';
import { parseTokens, resolve } from '../src/design/tokens';
import { MAP_VIEWBOX_HEIGHT, MAP_VIEWBOX_WIDTH } from '../src/map/target-size';

/*
 * Контракт живёт рядом со скриптами сборки, а не в src: чтение файла требует
 * узловых API, и держать их в области сборки приложения значило бы позволить
 * компоненту написать readFileSync и узнать об ошибке только в браузере.
 *
 * Путь считается от корня проекта: и Vitest, и `npx tsx` запускаются оттуда.
 */
const tokens = parseTokens(
  readFileSync(resolvePath(process.cwd(), 'src/design/tokens.css'), 'utf8'),
);
const color = (name: string) => resolve(tokens, name);

const LAND_TONES = [
  '--map-kind-province',
  '--map-kind-autonomous-region',
  '--map-kind-municipality',
  '--map-kind-sar',
] as const;

/** Все заливки, поверх которых карта когда-либо рисует границу или подпись. */
const MAP_FILLS = [...LAND_TONES, '--map-locked', '--map-sea'] as const;

/**
 * Заливки карты освоенности. В `MAP_FILLS` не входят намеренно: карта
 * освоенности не интерактивна, выделения и «верного ответа» на ней не бывает,
 * и требовать контраста между ними и этими заливками значило бы проверять
 * пару, которой на экране не существует.
 *
 * Граница по ним всё равно рисуется, поэтому в проверке границы они есть.
 */
const PROGRESS_FILLS = [
  '--map-progress-mastered',
  '--map-progress-in-progress',
  '--map-progress-untouched',
] as const;

/** Состояния, которые перекрашивают регион целиком. */
const FILLED_STATES = ['--map-selected', '--map-correct'] as const;

function expectAtLeast(
  foreground: string,
  background: string,
  threshold: number,
) {
  const ratio = contrastRatioRounded(color(foreground), color(background));

  expect(
    ratio,
    `${foreground} (${color(foreground)}) на ${background} (${color(
      background,
    )}): ${ratio}:1, нужно ${threshold}:1`,
  ).toBeGreaterThanOrEqual(threshold);
}

describe('текст', () => {
  it('основной текст на бумаге читается', () => {
    expectAtLeast('--text-on-paper', '--surface-paper', TEXT_CONTRAST);
    expectAtLeast('--text-on-paper', '--surface-paper-bright', TEXT_CONTRAST);
  });

  it('вспомогательный текст на бумаге читается', () => {
    expectAtLeast('--text-on-paper-muted', '--surface-paper', TEXT_CONTRAST);
  });

  it('текст на доске читается', () => {
    expectAtLeast('--text-on-ground', '--surface-ground', TEXT_CONTRAST);
    expectAtLeast('--text-on-ground', '--surface-raised', TEXT_CONTRAST);
  });

  it('вспомогательный текст на доске читается', () => {
    expectAtLeast('--text-on-ground-muted', '--surface-ground', TEXT_CONTRAST);
    expectAtLeast('--text-on-ground-muted', '--surface-raised', TEXT_CONTRAST);
  });

  it('заголовок на доске читается на обеих её поверхностях', () => {
    expectAtLeast('--text-on-ground-strong', '--surface-ground', TEXT_CONTRAST);
    expectAtLeast('--text-on-ground-strong', '--surface-raised', TEXT_CONTRAST);
  });

  it('акцент на доске читается', () => {
    expectAtLeast('--accent-on-ground', '--surface-ground', TEXT_CONTRAST);
  });

  it('акцент на бумаге читается', () => {
    expectAtLeast('--accent', '--surface-paper', TEXT_CONTRAST);
  });
});

describe('границы и поверхности', () => {
  it('бумага отделена от доски', () => {
    expectAtLeast('--surface-paper', '--surface-ground', GRAPHIC_CONTRAST);
  });

  it('линия на бумаге видна', () => {
    expectAtLeast('--line-on-paper', '--surface-paper', 1.4);
  });

  /*
   * Линий на доске две, и порог есть только у одной. `--line-on-ground`
   * разделяет — отбивка списка, черта под шапкой, край панели; разделителю
   * контраст не предписан. `--line-on-ground-strong` очерчивает управляющий
   * элемент, и ему WCAG 2.2 (1.4.11) требует 3:1 на обеих поверхностях доски.
   *
   * До того как вторая линия появилась, границей кнопок, поля поиска, кнопок
   * равнозначного списка и фильтра служил разделительный тон: 2.01:1 на доске
   * и 1.77:1 на поднятой поверхности.
   */
  it('граница управляющего элемента видна на обеих поверхностях доски', () => {
    expectAtLeast('--line-on-ground-strong', '--surface-ground', GRAPHIC_CONTRAST);
    expectAtLeast('--line-on-ground-strong', '--surface-raised', GRAPHIC_CONTRAST);
  });

  /*
   * Обе киновари нужны врозь. `--accent` — цвет цели на бумаге; на доске он
   * даёт 2.81:1, и черта «вы здесь» в шапке была слабее любой другой линии на
   * экране. `--accent-on-ground` — тот же смысл для тёмного.
   */
  it('акцент на доске годится и в роли черты, и в роли рамки', () => {
    expectAtLeast('--accent-on-ground', '--surface-ground', GRAPHIC_CONTRAST);
    expectAtLeast('--accent-on-ground', '--surface-raised', GRAPHIC_CONTRAST);
  });

  /*
   * «Верно» знаком на доске: лента хода раунда набирает 34 отметки `✓ ● ○` в
   * колонке вопроса. Заливкой карты (#356f52) их набирать нельзя — 2.78:1.
   */
  it('нефрит для доски читается знаком', () => {
    expectAtLeast('--state-correct-on-ground', '--surface-ground', TEXT_CONTRAST);
    expectAtLeast('--state-correct-on-ground', '--surface-raised', TEXT_CONTRAST);
  });

  it('на любой поверхности видно кольцо фокуса', () => {
    const surfaces = [
      '--surface-ground',
      '--surface-raised',
      '--surface-paper',
      '--surface-paper-bright',
      ...MAP_FILLS,
      ...FILLED_STATES,
    ];

    for (const surface of surfaces) {
      const onPaper = contrastRatioRounded(
        color('--focus-on-paper'),
        color(surface),
      );
      const onGround = contrastRatioRounded(
        color('--focus-on-ground'),
        color(surface),
      );

      expect(
        Math.max(onPaper, onGround),
        `фокус на ${surface} (${color(surface)}): тушь ${onPaper}:1, золото ${onGround}:1`,
      ).toBeGreaterThanOrEqual(GRAPHIC_CONTRAST);
    }
  });

  it('кольцо фокуса на карте рисуется тушью и видно на каждой заливке', () => {
    for (const fill of [...LAND_TONES, '--map-locked', '--map-sea']) {
      expectAtLeast('--focus-on-paper', fill, GRAPHIC_CONTRAST);
    }
  });

  it('кольцо фокуса на доске рисуется золотом', () => {
    expectAtLeast('--focus-on-ground', '--surface-ground', GRAPHIC_CONTRAST);
    expectAtLeast('--focus-on-ground', '--surface-raised', GRAPHIC_CONTRAST);
  });
});

describe('карта', () => {
  it('граница провинции видна на любой заливке (MAP_SPEC.md: не ниже 3:1)', () => {
    for (const fill of [...MAP_FILLS, ...PROGRESS_FILLS]) {
      expectAtLeast('--map-border', fill, GRAPHIC_CONTRAST);
    }
  });

  it('подпись состояния читается на его заливке', () => {
    for (const state of FILLED_STATES) {
      expectAtLeast(`${state}-ink`, state, TEXT_CONTRAST);
    }
  });

  it('подпись региона читается на любой заливке суши', () => {
    for (const fill of [...LAND_TONES, '--map-locked']) {
      expectAtLeast('--map-label', fill, TEXT_CONTRAST);
    }
  });

  /**
   * Ступени рельефа. Линия реки идёт поверх всех четырёх заливок, и ей, как
   * всякой графике, несущей смысл, WCAG 2.2 (1.4.11) требует 3:1. Это
   * связывающее ограничение всей палитры: чем темнее ступень, тем темнее
   * обязана быть линия, а темнее туши она быть не может.
   */
  const RELIEF_FILLS = [
    '--map-relief-step-1',
    '--map-relief-step-2',
    '--map-relief-step-3',
    '--map-relief-rest',
  ] as const;

  it('линия реки видна на каждой ступени рельефа', () => {
    for (const fill of RELIEF_FILLS) {
      expectAtLeast('--map-river', fill, GRAPHIC_CONTRAST);
    }
  });

  it('граница региона видна на каждой ступени рельефа', () => {
    for (const fill of RELIEF_FILLS) {
      expectAtLeast('--map-border', fill, GRAPHIC_CONTRAST);
    }
  });

  it('подпись объекта читается на каждой ступени рельефа', () => {
    for (const fill of RELIEF_FILLS) {
      expectAtLeast('--map-label', fill, TEXT_CONTRAST);
    }
  });

  it('соседние ступени различимы по светлоте', () => {
    /*
     * Не требование WCAG: смысл несёт ещё и слово в легенде. Но ступени —
     * главное, что говорит эта карта, и сливаться им нельзя. Измеренный предел
     * при линии светлотой 0.045 — около 1.79 между соседними.
     */
    for (const [darker, lighter] of [
      ['--map-relief-step-1', '--map-relief-step-2'],
      ['--map-relief-step-2', '--map-relief-step-3'],
    ] as const) {
      const ratio = contrastRatioRounded(color(darker), color(lighter));
      expect(ratio, `${darker} против ${lighter}: ${ratio}:1`).toBeGreaterThan(1.3);
    }
  });

  it('залитое состояние отличимо от любой соседней заливки', () => {
    for (const state of FILLED_STATES) {
      for (const fill of MAP_FILLS) {
        expectAtLeast(state, fill, GRAPHIC_CONTRAST);
      }
    }
  });

  it('отметка ошибки видна поверх любой заливки суши', () => {
    // Ошибка не перекрашивает регион, а штрихуется поверх его цвета,
    // поэтому проверяется цвет штриховки против всех возможных заливок.
    for (const fill of [...LAND_TONES, '--map-locked']) {
      expectAtLeast('--map-incorrect-mark', fill, GRAPHIC_CONTRAST);
    }
  });

  /*
   * Пары «верно против неверно» здесь нет намеренно: это два разных региона,
   * а не два цвета друг на друге. Различают их вид отметки — сплошная тёмная
   * заливка против штриховки поверх собственного цвета — и обе проверены
   * против всех заливок суши выше.
   */

  it('закрытая заливка отличима от активных', () => {
    // После ответа выбор закрыт. Прежняя пара #EAECF0/#D0D5DD давала 1.25:1 —
    // ученик не видел, что карта больше не отвечает.
    for (const fill of LAND_TONES) {
      const ratio = contrastRatioRounded(color('--map-locked'), color(fill));
      expect(ratio, `--map-locked против ${fill}: ${ratio}:1`).toBeGreaterThan(
        1,
      );
    }
  });
});

describe('шкалы', () => {
  it('цель нажатия не меньше 44 px', () => {
    expect(Number.parseInt(resolve(tokens, '--target-min'), 10)).toBeGreaterThanOrEqual(
      44,
    );
  });

  it('семейства начинаются с наших шрифтов и сохраняют системный фолбэк', () => {
    expect(resolve(tokens, '--t-family-display')).toMatch(/^'Prata'/);
    expect(resolve(tokens, '--t-family-display')).toMatch(/serif$/);
    expect(resolve(tokens, '--t-family-text')).toMatch(/^'Golos Text'/);
    expect(resolve(tokens, '--t-family-han')).toMatch(/^'Noto Serif SC'/);
  });

  it('латинские шрифты уступают китайскому знаки, которых у них нет', () => {
    // `● ○ ✓ → ≈` есть только в Noto Serif SC, поэтому он стоит вторым.
    expect(resolve(tokens, '--t-family-display')).toContain("'Noto Serif SC'");
    expect(resolve(tokens, '--t-family-text')).toContain("'Noto Serif SC'");
  });

  it('длительности заданы токенами, чтобы их можно было обнулить', () => {
    expect(tokens.has('--duration-quick')).toBe(true);
    expect(tokens.has('--duration-calm')).toBe(true);
  });
});

describe('игровая карта', () => {
  const OUTCOMES = ['--map-first-try', '--map-second-try', '--map-failed'] as const;

  it('граница тушью видна на сером и на каждом исходе', () => {
    expectAtLeast('--map-border', '--map-unplayed', GRAPHIC_CONTRAST);
    for (const outcome of OUTCOMES) {
      expectAtLeast('--map-border', outcome, GRAPHIC_CONTRAST);
    }
  });

  it('граница тушью видна на море: береговую линию держит обводка', () => {
    expectAtLeast('--map-border', '--map-sea', GRAPHIC_CONTRAST);
  });

  it('каждый исход отличим от серого, иначе прогресс не виден', () => {
    for (const outcome of OUTCOMES) {
      expectAtLeast(outcome, '--map-unplayed', GRAPHIC_CONTRAST);
    }
  });

  it('подпись читается поверх любого исхода', () => {
    for (const outcome of OUTCOMES) {
      expectAtLeast('--map-outcome-ink', outcome, TEXT_CONTRAST);
    }
  });

  /*
   * Попарного контраста между тремя исходами здесь нет намеренно: он
   * недостижим. Обводка тушью требует светлоты не ниже 0.118, а серый при
   * 3:1 сверху — не выше 0.153, и все три цвета живут в этой полосе.
   * Различает их узор, см. MapDefs.tsx.
   */
});

describe('макет карты', () => {
  it('пропорция карты в токенах совпадает с viewBox', () => {
    const [width, height] = resolve(tokens, '--map-aspect')
      .split('/')
      .map((part) => Number(part.trim()));

    expect(width).toBe(MAP_VIEWBOX_WIDTH);
    expect(height).toBe(MAP_VIEWBOX_HEIGHT);
  });

});

describe('карта коллекции', () => {
  it('граница тушью видна и на входящих регионах, и на остальных', () => {
    expectAtLeast('--map-border', '--map-member', GRAPHIC_CONTRAST);
    expectAtLeast('--map-border', '--map-outside', GRAPHIC_CONTRAST);
  });

  it('входящий регион отличим от остальных: в этом весь смысл карты', () => {
    expectAtLeast('--map-member', '--map-outside', GRAPHIC_CONTRAST);
  });
});

describe('справочная карта', () => {
  const KINDS = [
    '--map-kind-province',
    '--map-kind-autonomous-region',
    '--map-kind-municipality',
    '--map-kind-sar',
  ] as const;

  it('граница и подпись тушью видны на каждом типе региона', () => {
    for (const kind of KINDS) {
      expectAtLeast('--map-border', kind, GRAPHIC_CONTRAST);
      expectAtLeast('--map-label', kind, TEXT_CONTRAST);
    }
  });
});
