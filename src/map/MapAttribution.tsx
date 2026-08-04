/**
 * Сведения о происхождении геометрии. Стоят в подвале, а не над картой: это
 * не шаг обучения, и трём ссылкам незачем быть первыми остановками Tab на
 * экране, где ученик отвечает.
 */
export function MapAttribution() {
  return (
    <p className="map-attribution">
      Геометрия 33 регионов: карта{' '}
      <a href="https://www.npmjs.com/package/@svg-maps/china">@svg-maps/china</a>{' '}
      (Victor Cazanave, на основе MapSVG) по лицензии{' '}
      <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.{' '}
      Контур Тайваня:{' '}
      <a href="https://github.com/antvis/china-geojson">china-geojson</a> (AntV).
    </p>
  );
}
