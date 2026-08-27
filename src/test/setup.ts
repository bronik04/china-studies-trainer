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

/*
 * jsdom не реализует `scrollIntoView`, а переход на раздел главной подтягивает
 * его в кадр. Заглушка ничего не делает: раскладки в jsdom нет, прокручивать
 * нечего, а падать переходу незачем.
 */
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

/*
 * jsdom не загружает изображения и не шлёт `load`, а раунд «Культура» ждёт
 * этих событий, прогревая снимки до первого вопроса. Заглушка отвечает сразу
 * после присвоения `src`: сети в тестах нет, ждать нечего, а не начаться
 * раунду незачем.
 */
const imageSource = Object.getOwnPropertyDescriptor(
  HTMLImageElement.prototype,
  'src',
);

Object.defineProperty(HTMLImageElement.prototype, 'src', {
  configurable: true,
  enumerable: true,
  get(this: HTMLImageElement) {
    return imageSource?.get?.call(this) ?? '';
  },
  set(this: HTMLImageElement, value: string) {
    imageSource?.set?.call(this, value);
    queueMicrotask(() => this.dispatchEvent(new Event('load')));
  },
});
