import { getSafeTextColor } from '../accessibility';

describe('getSafeTextColor', () => {
  it('returns white for dark background', () => {
    expect(getSafeTextColor('#1a1a2e')).toBe('#FFFFFF');
  });

  it('returns black for light background', () => {
    expect(getSafeTextColor('#fef3c7')).toBe('#000000');
  });

  it.each([
    'not-a-color',
    'rgb(0,0,0)',
    '#fff',
    '',
  ])('returns #FFFFFF fallback for invalid input: %s', (input) => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    expect(getSafeTextColor(input)).toBe('#FFFFFF');
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('includes caller name in warning', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    getSafeTextColor('bad', 'TestCaller');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('TestCaller'));
    spy.mockRestore();
  });
});
