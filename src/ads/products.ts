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

const CATEGORIES: readonly string[] = ['top', 'bottom', 'outer'];
const BODY_TYPE_RE = /^(inverted|balanced|triangle)-(longTorso|balanced|longLegs)$/;
const URL_RE = /^https?:\/\//;

function isProduct(row: unknown): row is Product {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  const fields = ['image', 'name', 'price', 'url', 'bodyType', 'category'] as const;
  if (!fields.every((f) => typeof r[f] === 'string')) return false;
  const { url, bodyType, category } = r as Record<(typeof fields)[number], string>;
  return CATEGORIES.includes(category)
    && (bodyType === 'any' || BODY_TYPE_RE.test(bodyType))
    && URL_RE.test(url);
}

/** products.json 내용 검증: 배열이 아니면 [], 형식이 틀린 행은 버린다 */
export function sanitizeProducts(data: unknown): Product[] {
  return Array.isArray(data) ? data.filter(isProduct) : [];
}

/**
 * 시작 화면에서 미리 호출한다(결과 화면에서 네트워크 요청이 생기지 않도록).
 * 이 앱에서 fetch가 허용된 유일한 앱 코드.
 */
export async function loadProducts(url = `${import.meta.env.BASE_URL}products.json`): Promise<Product[]> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return sanitizeProducts(data);
  } catch {
    return [];
  }
}
