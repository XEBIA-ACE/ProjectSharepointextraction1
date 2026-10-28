import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { createSearchRouter } from './http/searchRouter';
import type { Logger } from './logger';
import type { ProductSearchService } from './search/productSearchService';

export interface AppDeps {
  searchService: ProductSearchService;
  logger: Logger;
}

export function createApp({ searchService, logger }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use('/search', createSearchRouter({ searchService, logger }));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  });

  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) logger.error({ event: 'http.error', message: err.message });
    res.status(status).json({
      error: { code: status === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST', message: status === 500 ? 'Internal server error' : err.message },
    });
  });

  return app;
}
