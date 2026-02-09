import React from 'react';
import { renderWithProviders } from '../../../__tests__/test-utils';
import { Divider } from '../Divider';

describe('Divider', () => {
  it('renders without crashing', () => {
    const { toJSON } = renderWithProviders(<Divider />);
    expect(toJSON()).toBeTruthy();
  });

  it('accepts a spacing prop', () => {
    const { toJSON } = renderWithProviders(<Divider spacing="5" />);
    expect(toJSON()).toBeTruthy();
  });
});
