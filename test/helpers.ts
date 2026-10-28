import { createApp } from '../src/app';
import { loadProductCatalog } from '../src/catalog/productCatalog';
import type { LogFields, Logger } from '../src/logger';
import { ProductSearchIndex } from '../src/search/productSearchIndex';
import { ProductSearchService } from '../src/search/productSearchService';
import type { Product } from '../src/search/types';

export class CapturingLogger implements Logger {
  readonly entries: (LogFields & { level: string })[] = [];
  info(fields: LogFields): void {
    this.entries.push({ level: 'info', ...fields });
  }
  warn(fields: LogFields): void {
    this.entries.push({ level: 'warn', ...fields });
  }
  error(fields: LogFields): void {
    this.entries.push({ level: 'error', ...fields });
  }
}

export function buildService(products: Product[] = loadProductCatalog()): ProductSearchService {
  return new ProductSearchService(new ProductSearchIndex(products));
}

export function buildApp(products?: Product[], logger: Logger = new CapturingLogger()) {
  return createApp({ searchService: buildService(products), logger });
}
