import { render, screen } from '@testing-library/react';
import { MapAttribution } from './MapAttribution';

it('называет источник геометрии и лицензию', () => {
  render(<MapAttribution />);

  expect(
    screen.getByRole('link', { name: '@svg-maps/china' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'china-geojson' })).toBeInTheDocument();
});
