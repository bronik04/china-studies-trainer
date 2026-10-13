import { render, screen } from '@testing-library/react';
import { MapAttribution } from './MapAttribution';

it('называет источник геометрии и лицензию', () => {
  render(<MapAttribution />);

  expect(
    screen.getByRole('link', { name: '@svg-maps/china' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'china-geojson' })).toBeInTheDocument();

  /*
   * ODbL требует указать авторство OpenStreetMap там, где показана карта с
   * производной от неё линией, — и назвать лицензию.
   */
  expect(
    screen.getByRole('link', { name: 'участники OpenStreetMap' }),
  ).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
  expect(screen.getByRole('link', { name: 'ODbL' })).toBeInTheDocument();
});
