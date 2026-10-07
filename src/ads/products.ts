import type { BodyTypeKey } from '../analysis/style';

export type ProductCategory = 'top' | 'bottom' | 'outer';

export interface Product {
  image: string;
  name: string;
  price: string;
  url: string;
  bodyType: BodyTypeKey | 'any';
  category: ProductCategory;
}

/** 체형 일치 상품 우선, 없으면 'any', 그래도 없으면 null */
export function pickProduct(
  products: Product[],
  key: BodyTypeKey,
  category: ProductCategory,
  rand: () => number = Math.random,
): Product | null {
  const inCat = products.filter((p) => p.category === category);
  const exact = inCat.filter((p) => p.bodyType === key);
  const pool = exact.length ? exact : inCat.filter((p) => p.bodyType === 'any');
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

/**
 * 시작 화면에서 미리 호출한다(결과 화면에서 네트워크 요청이 생기지 않도록).
 * 이 앱에서 fetch가 허용된 유일한 앱 코드.
 */
export async function loadProducts(url = '/products.json'): Promise<Product[]> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as Product[]) : [];
  } catch {
    return [];
  }
}
