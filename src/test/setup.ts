import '@testing-library/jest-dom/vitest';

/*
 * jsdom не реализует `ResizeObserver`, а шапка измеряет им свою высоту и
 * отдаёт её разметке через `--header-height`. Заглушка ничего не наблюдает:
 * раскладки в jsdom нет, измерять нечего, а падать импорту незачем.
 */
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
