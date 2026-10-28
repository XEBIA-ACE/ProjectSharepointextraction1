import { readFileSync } from 'node:fs';
import storeProducts from '../data/products.json';
import type { Product } from '../search/types';

function assertProducts(data: unknown): asserts data is Product[] {
  if (!Array.isArray(data)) throw new Error('Product catalog must be a JSON array');
  for (const item of data) {
    if (typeof item?.id !== 'string' || typeof item?.name !== 'string') {
      throw new Error('Every product must have string "id" and "name" fields');
    }
  }
}

/** Loads store product data from PRODUCT_CATALOG_PATH, falling back to the bundled catalog. */
export function loadProductCatalog(path = process.env.PRODUCT_CATALOG_PATH): Product[] {
  const data: unknown = path ? JSON.parse(readFileSync(path, 'utf8')) : storeProducts;
  assertProducts(data);
  return data;
}
