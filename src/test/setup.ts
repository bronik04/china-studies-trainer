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

/*
 * jsdom не реализует модальный `<dialog>`: `showModal` у него просто нет.
 * Заглушка открывает окно и закрывает его по Esc — этого хватает, чтобы
 * проверить поведение. Верхний слой, возврат фокуса и недоступность остальной
 * страницы остаются на браузере: их jsdom всё равно не показывает, а
 * подделывать их значило бы проверять подделку.
 */
const dialog = HTMLDialogElement.prototype as HTMLDialogElement;

if (typeof dialog.showModal !== 'function') {
  dialog.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };

  dialog.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
