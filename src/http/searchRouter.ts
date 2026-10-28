import { Router, type Request, type Response } from 'express';
import type { Logger } from '../logger';
import type { ProductSearchService } from '../search/productSearchService';
import { normalizeText } from '../search/textNormalizer';

export const NO_PRODUCTS_FOUND_MESSAGE = 'No products found';
export const MAX_QUERY_LENGTH = 200;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const MAX_OFFSET = 10_000;
export const RESPONSE_TIME_BUDGET_MS = 2000;

export interface SearchRouterDeps {
  searchService: ProductSearchService;
  logger: Logger;
}

class ValidationError extends Error {}

function sanitizeQuery(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readQuery(req: Request): string {
  const fromQueryString = req.query.q;
  let raw: string;
  if (fromQueryString !== undefined) {
    if (typeof fromQueryString !== 'string') throw new ValidationError('Query parameter "q" must be a single string');
    raw = fromQueryString;
  } else {
    raw = (req.params[0] ?? '').replace(/\//g, ' ');
  }
  const query = sanitizeQuery(raw);
  if (query.length === 0) throw new ValidationError('A product name search term is required');
  if (query.length > MAX_QUERY_LENGTH) {
    throw new ValidationError(`Search term must be at most ${MAX_QUERY_LENGTH} characters`);
  }
  if (normalizeText(query).length === 0) throw new ValidationError('Search term must contain letters or digits');
  return query;
}

function readInt(req: Request, name: string, fallback: number, min: number, max: number): number {
  const value = req.query[name];
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new ValidationError(`Query parameter "${name}" must be a non-negative integer`);
  }
  const parsed = Number(value);
  if (parsed < min || parsed > max) {
    throw new ValidationError(`Query parameter "${name}" must be between ${min} and ${max}`);
  }
  return parsed;
}

export function createSearchRouter({ searchService, logger }: SearchRouterDeps): Router {
  const router = Router();

  router.use((_req, res, next) => {
    const start = process.hrtime.bigint();
    const setTiming = res.writeHead.bind(res);
    res.writeHead = ((...args: Parameters<Response['writeHead']>) => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      res.locals.durationMs = durationMs;
      res.setHeader('Server-Timing', `search;dur=${durationMs.toFixed(2)}`);
      return setTiming(...args);
    }) as Response['writeHead'];
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const fields = {
        event: 'search.request',
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        queryLength: res.locals.queryLength,
        total: res.locals.total,
      };
      if (durationMs > RESPONSE_TIME_BUDGET_MS) logger.warn({ ...fields, budgetMs: RESPONSE_TIME_BUDGET_MS });
      else logger.info(fields);
    });
    next();
  });

  router.get('/*', (req, res) => {
    let query: string;
    let limit: number;
    let offset: number;
    try {
      query = readQuery(req);
      limit = readInt(req, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT);
      offset = readInt(req, 'offset', 0, 0, MAX_OFFSET);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: { code: 'INVALID_QUERY', message: err.message } });
        return;
      }
      throw err;
    }

    res.locals.queryLength = query.length;
    const { total, hits } = searchService.search(query, { limit, offset });
    res.locals.total = total;

    res.status(200).json({
      query,
      total,
      limit,
      offset,
      results: hits.map(({ product, score }) => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        price: product.price,
        score: Number(score.toFixed(4)),
      })),
      ...(total === 0 ? { message: NO_PRODUCTS_FOUND_MESSAGE } : {}),
    });
  });

  return router;
}
