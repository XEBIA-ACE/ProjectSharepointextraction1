import { LruCache } from './lruCache';
import { ProductSearchIndex } from './productSearchIndex';
import { tokenize } from './textNormalizer';
import type { SearchOptions, SearchResult } from './types';

export interface ProductSearchServiceOptions {
  cacheMaxEntries?: number;
  cacheTtlMs?: number;
}

export class ProductSearchService {
  private readonly cache: LruCache<string, SearchResult>;

  constructor(
    private readonly index: ProductSearchIndex,
    { cacheMaxEntries = 1000, cacheTtlMs = 60_000 }: ProductSearchServiceOptions = {},
  ) {
    this.cache = new LruCache(cacheMaxEntries, cacheTtlMs);
  }

  search(query: string, options: SearchOptions): SearchResult {
    const key = `${tokenize(query).join(' ')}|${options.limit}|${options.offset}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const result = this.index.search(query, options);
    this.cache.set(key, result);
    return result;
  }
}
