/**
 * Сведения о происхождении геометрии. Стоят под картой, а не над ней: это не
 * шаг обучения, и пяти ссылкам незачем быть первыми остановками Tab на
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
      <a href="https://github.com/antvis/china-geojson">china-geojson</a> (AntV).{' '}
      Линия Великого канала: ©{' '}
      <a href="https://www.openstreetmap.org/copyright">участники OpenStreetMap</a>,{' '}
      <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>.
    </p>
  );
}
