import { PesoPipe } from './peso.pipe';

describe('PesoPipe', () => {
  const pipe = new PesoPipe();

  it('formats whole amounts', () => {
    expect(pipe.transform(149)).toBe('₱149.00');
  });

  it('adds a thousands separator', () => {
    expect(pipe.transform(1234.5)).toBe('₱1,234.50');
  });

  it('handles null and undefined', () => {
    expect(pipe.transform(null)).toBe('₱0.00');
    expect(pipe.transform(undefined)).toBe('₱0.00');
  });
});
