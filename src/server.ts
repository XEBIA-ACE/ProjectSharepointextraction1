import { createApp } from './app';
import { loadProductCatalog } from './catalog/productCatalog';
import { jsonLogger } from './logger';
import { ProductSearchIndex } from './search/productSearchIndex';
import { ProductSearchService } from './search/productSearchService';

const port = Number(process.env.PORT ?? 3000);
const index = new ProductSearchIndex(loadProductCatalog());
const app = createApp({ searchService: new ProductSearchService(index), logger: jsonLogger });

app.listen(port, () => {
  jsonLogger.info({ event: 'server.started', port, indexedProducts: index.size });
});
