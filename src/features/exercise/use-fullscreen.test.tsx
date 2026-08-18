import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useFullscreen } from './use-fullscreen';

/** Пробный компонент: хук нельзя вызвать вне рендера. */
function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(ref);

  return (
    <div ref={ref} data-testid="stage">
      {fullscreen.isAvailable ? (
        <button type="button" onClick={fullscreen.toggle}>
          {fullscreen.isFullscreen ? 'Свернуть' : 'Во весь экран'}
        </button>
      ) : (
        <p>кнопки нет</p>
      )}
    </div>
  );
}

afterEach(() => {
  // jsdom не знает Fullscreen API: свойства ставятся тестом и убираются им же.
  Reflect.deleteProperty(document, 'fullscreenEnabled');
  Reflect.deleteProperty(document, 'fullscreenElement');
  Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
  Reflect.deleteProperty(document, 'exitFullscreen');
  vi.restoreAllMocks();
});

it('без Fullscreen API кнопка не показывается', () => {
  render(<Probe />);

  expect(screen.getByText('кнопки нет')).toBeTruthy();
});

it('разворачивает корень и слушает fullscreenchange', () => {
  Object.defineProperty(document, 'fullscreenEnabled', {
    configurable: true,
    value: true,
  });
  const request = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
    configurable: true,
    value: request,
  });
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });

  render(<Probe />);
  fireEvent.click(screen.getByRole('button', { name: 'Во весь экран' }));

  expect(request).toHaveBeenCalledTimes(1);

  // Браузер отвечает событием — состояние читается из него, не из вызова.
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: screen.getByTestId('stage'),
  });
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'));
  });

  expect(screen.getByRole('button', { name: 'Свернуть' })).toBeTruthy();
});
