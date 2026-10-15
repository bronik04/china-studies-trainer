/**
 * Сведения о происхождении геометрии. Стоят под картой, а не над ней: это не
 * шаг обучения, и пяти ссылкам незачем быть первыми остановками Tab на
 * экране, где ученик отвечает.
 *
 * Коротко, но без потерь для лицензий: CC BY требует назвать работу, автора и
 * лицензию, ODbL — авторство OpenStreetMap и саму лицензию. «Геометрия 33
 * регионов» и «на основе MapSVG» ушли — первое видно по карте, второе есть в
 * источниках на главной.
 */
export function MapAttribution() {
  return (
    <p className="map-attribution">
      Карта:{' '}
      <a href="https://www.npmjs.com/package/@svg-maps/china">@svg-maps/china</a>,
      Victor Cazanave,{' '}
      <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>;
      Тайвань:{' '}
      <a href="https://github.com/antvis/china-geojson">china-geojson</a>, AntV;
      Великий канал: ©{' '}
      <a href="https://www.openstreetmap.org/copyright">участники OpenStreetMap</a>,{' '}
      <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>.
    </p>
  );
}
