import type { ProductSearchService } from './productSearchService';

export interface RelevanceJudgement {
  query: string;
  /** Product ids considered a correct answer for the query; any one of them in the top K is a hit. */
  relevantProductIds: string[];
}

export interface HitRatioReport {
  k: number;
  total: number;
  hits: number;
  ratio: number;
  misses: { query: string; returnedIds: string[] }[];
}

/** Hit-ratio@K: share of judged queries for which at least one relevant product is ranked in the top K. */
export function evaluateHitRatio(
  service: ProductSearchService,
  judgements: readonly RelevanceJudgement[],
  k = 5,
): HitRatioReport {
  const misses: HitRatioReport['misses'] = [];
  let hits = 0;
  for (const { query, relevantProductIds } of judgements) {
    const returnedIds = service.search(query, { limit: k, offset: 0 }).hits.map((h) => h.product.id);
    if (returnedIds.some((id) => relevantProductIds.includes(id))) hits++;
    else misses.push({ query, returnedIds });
  }
  return { k, total: judgements.length, hits, ratio: judgements.length ? hits / judgements.length : 0, misses };
}
