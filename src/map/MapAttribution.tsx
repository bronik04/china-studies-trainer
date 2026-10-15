/**
 * Сведения о происхождении геометрии. Стоят под картой, а не над ней: это не
 * шаг обучения, и пяти ссылкам незачем быть первыми остановками Tab на
 * экране, где ученик отвечает.
 *
 * Коротко, но со всем, что требуют лицензии: CC BY — работу, автора, тех, на
 * чьей работе она основана (MapSVG), лицензию и отметку об изменениях; ODbL —
 * авторство OpenStreetMap и саму лицензию.
 */
export function MapAttribution() {
  return (
    <p className="map-attribution">
      Карта:{' '}
      <a href="https://www.npmjs.com/package/@svg-maps/china">@svg-maps/china</a>,
      Victor Cazanave, на основе MapSVG,{' '}
      <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, с
      изменениями;
      Тайвань:{' '}
      <a href="https://github.com/antvis/china-geojson">china-geojson</a>, AntV;
      Великий канал: ©{' '}
      <a href="https://www.openstreetmap.org/copyright">участники OpenStreetMap</a>,{' '}
      <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>.
    </p>
  );
}
