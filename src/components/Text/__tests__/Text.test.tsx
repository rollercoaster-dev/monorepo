import React from 'react';
import { renderWithProviders, screen } from '../../../__tests__/test-utils';
import { Text } from '../Text';

describe('Text', () => {
  it('renders children', () => {
    renderWithProviders(<Text>Hello world</Text>);
    expect(screen.getByText('Hello world')).toBeOnTheScreen();
  });

  it('defaults to body variant', () => {
    renderWithProviders(<Text>Body text</Text>);
    expect(screen.getByText('Body text')).toBeOnTheScreen();
  });

  it('accepts a variant prop', () => {
    renderWithProviders(<Text variant="headline">Headline</Text>);
    expect(screen.getByText('Headline')).toBeOnTheScreen();
  });
});
