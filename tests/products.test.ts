import { describe, it, expect } from 'vitest';
import { pickProduct, type Product } from '../src/ads/products';

const P = (over: Partial<Product>): Product => ({
  image: '', name: 'n', price: '₩10,000', url: 'https://example.com', bodyType: 'any', category: 'top', ...over,
});

describe('pickProduct', () => {
  const list: Product[] = [
    P({ name: 'inv-top', bodyType: 'inverted-balanced', category: 'top' }),
    P({ name: 'any-top', bodyType: 'any', category: 'top' }),
    P({ name: 'any-bottom', bodyType: 'any', category: 'bottom' }),
  ];
  it('prefers exact body type', () => {
    expect(pickProduct(list, 'inverted-balanced', 'top')!.name).toBe('inv-top');
  });
  it('falls back to any', () => {
    expect(pickProduct(list, 'triangle-longLegs', 'top')!.name).toBe('any-top');
  });
  it('returns null when nothing matches category', () => {
    expect(pickProduct(list, 'triangle-longLegs', 'outer')).toBeNull();
  });
  it('uses rand to choose among candidates', () => {
    const two = [P({ name: 'a' }), P({ name: 'b' })];
    expect(pickProduct(two, 'balanced-balanced', 'top', () => 0)!.name).toBe('a');
    expect(pickProduct(two, 'balanced-balanced', 'top', () => 0.99)!.name).toBe('b');
  });
});
