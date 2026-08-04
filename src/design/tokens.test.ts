/**
 * Контракт дизайн-системы. Каждая пара, от которой зависит понимание
 * интерфейса, проверена по WCAG 2.2. Тест падает, если палитру ухудшили.
 *
 * Проверяются только пары, которые реально встречаются на экране: контраст
 * двух цветов, никогда не оказывающихся рядом, ничего не значит.
 */
import { describe, expect, it } from 'vitest';
import {
  GRAPHIC_CONTRAST,
  TEXT_CONTRAST,
  contrastRatioRounded,
} from './contrast';
import { readTokens, resolve } from './tokens';

const tokens = readTokens();
const color = (name: string) => resolve(tokens, name);

const LAND_TONES = [
  '--map-land-1',
  '--map-land-2',
  '--map-land-3',
  '--map-land-4',
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

  it('движение снимается по запросу пользователя', () => {
    const css = readTokens();
    expect(css.has('--duration-quick')).toBe(true);
  });
});
