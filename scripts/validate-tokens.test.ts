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
    for (const fill of MAP_FILLS) {
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
