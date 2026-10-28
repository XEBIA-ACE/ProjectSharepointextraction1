import { boundedEditDistance } from './editDistance';
import { LruCache } from './lruCache';
import { tokenize } from './textNormalizer';
import type { Product, SearchOptions, SearchResult } from './types';

export interface FieldWeights {
  name: number;
  brand: number;
  category: number;
  tags: number;
  description: number;
}

export interface RelevanceConfig {
  /** BM25 term-frequency saturation. */
  k1: number;
  /** BM25 document-length normalisation. */
  b: number;
  fieldWeights: FieldWeights;
  /** Score multiplier for vocabulary terms that extend the query term (type-ahead). */
  prefixFactor: number;
  /** Score multiplier for vocabulary terms within the allowed edit distance (typos). */
  fuzzyFactor: number;
  /** Multiplier when the full query appears contiguously in the product name. */
  phraseBoost: number;
  /** Additional multiplier when the product name starts with the query. */
  namePrefixBoost: number;
  minPrefixLength: number;
  minFuzzyLength: number;
  maxExpansionsPerTerm: number;
}

export const DEFAULT_RELEVANCE_CONFIG: RelevanceConfig = {
  k1: 1.2,
  b: 0.5,
  fieldWeights: { name: 3, brand: 2, category: 1.5, tags: 1.5, description: 0.5 },
  prefixFactor: 0.7,
  fuzzyFactor: 0.6,
  phraseBoost: 1.5,
  namePrefixBoost: 1.2,
  minPrefixLength: 2,
  minFuzzyLength: 4,
  maxExpansionsPerTerm: 50,
};

interface Expansion {
  term: string;
  factor: number;
}

interface IndexedDoc {
  product: Product;
  length: number;
  nameTokens: string;
}

/**
 * Immutable in-memory inverted index over active products with field-weighted BM25
 * ranking, prefix (type-ahead) and typo-tolerant term expansion, query-coverage
 * weighting and phrase boosting.
 */
export class ProductSearchIndex {
  private readonly config: RelevanceConfig;
  private readonly docs: IndexedDoc[] = [];
  private readonly postings = new Map<string, Map<number, number>>();
  private readonly sortedTerms: string[];
  private readonly termsByLength = new Map<number, string[]>();
  private readonly avgDocLength: number;
  private readonly expansionCache = new LruCache<string, Expansion[]>(5000, Number.POSITIVE_INFINITY);

  constructor(products: readonly Product[], config: Partial<RelevanceConfig> = {}) {
    this.config = {
      ...DEFAULT_RELEVANCE_CONFIG,
      ...config,
      fieldWeights: { ...DEFAULT_RELEVANCE_CONFIG.fieldWeights, ...config.fieldWeights },
    };

    let totalLength = 0;
    for (const product of products) {
      if (product.active === false) continue;
      const docIndex = this.docs.length;
      const weightedTf = new Map<string, number>();
      let length = 0;
      const fields: [keyof FieldWeights, string][] = [
        ['name', product.name],
        ['brand', product.brand],
        ['category', product.category],
        ['tags', (product.tags ?? []).join(' ')],
        ['description', product.description],
      ];
      for (const [field, text] of fields) {
        const weight = this.config.fieldWeights[field];
        for (const token of tokenize(text ?? '')) {
          weightedTf.set(token, (weightedTf.get(token) ?? 0) + weight);
          length += weight;
        }
      }
      for (const [term, tf] of weightedTf) {
        let posting = this.postings.get(term);
        if (!posting) {
          posting = new Map();
          this.postings.set(term, posting);
        }
        posting.set(docIndex, tf);
      }
      totalLength += length;
      this.docs.push({ product, length, nameTokens: ` ${tokenize(product.name).join(' ')} ` });
    }

    this.avgDocLength = this.docs.length > 0 ? totalLength / this.docs.length : 1;
    this.sortedTerms = [...this.postings.keys()].sort();
    for (const term of this.sortedTerms) {
      const bucket = this.termsByLength.get(term.length) ?? [];
      bucket.push(term);
      this.termsByLength.set(term.length, bucket);
    }
  }

  get size(): number {
    return this.docs.length;
  }

  search(query: string, { limit, offset }: SearchOptions): SearchResult {
    const queryTerms = [...new Set(tokenize(query))];
    if (queryTerms.length === 0 || this.docs.length === 0) return { total: 0, hits: [] };

    const totals = new Map<number, { sum: number; matched: number }>();
    for (const queryTerm of queryTerms) {
      const best = new Map<number, number>();
      for (const { term, factor } of this.expand(queryTerm)) {
        const posting = this.postings.get(term);
        if (!posting) continue;
        const idf = Math.log(1 + (this.docs.length - posting.size + 0.5) / (posting.size + 0.5));
        for (const [docIndex, tf] of posting) {
          const score = idf * this.saturate(tf, this.docs[docIndex].length) * factor;
          if (score > (best.get(docIndex) ?? 0)) best.set(docIndex, score);
        }
      }
      for (const [docIndex, score] of best) {
        const entry = totals.get(docIndex);
        if (entry) {
          entry.sum += score;
          entry.matched += 1;
        } else {
          totals.set(docIndex, { sum: score, matched: 1 });
        }
      }
    }

    const minMatched = Math.ceil(queryTerms.length / 2);
    const phrase = ` ${queryTerms.join(' ')} `;
    const scored: { docIndex: number; score: number }[] = [];
    for (const [docIndex, { sum, matched }] of totals) {
      if (matched < minMatched) continue;
      const coverage = matched / queryTerms.length;
      let score = sum * coverage * coverage;
      const { nameTokens } = this.docs[docIndex];
      if (nameTokens.includes(phrase)) {
        score *= this.config.phraseBoost;
        if (nameTokens.startsWith(phrase)) score *= this.config.namePrefixBoost;
      }
      scored.push({ docIndex, score });
    }

    scored.sort((x, y) => {
      if (y.score !== x.score) return y.score - x.score;
      const a = this.docs[x.docIndex].product;
      const b = this.docs[y.docIndex].product;
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });

    return {
      total: scored.length,
      hits: scored.slice(offset, offset + limit).map(({ docIndex, score }) => ({
        product: this.docs[docIndex].product,
        score,
      })),
    };
  }

  private saturate(tf: number, docLength: number): number {
    const { k1, b } = this.config;
    return (tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * docLength) / this.avgDocLength));
  }

  private expand(queryTerm: string): Expansion[] {
    const cached = this.expansionCache.get(queryTerm);
    if (cached) return cached;

    const { prefixFactor, fuzzyFactor, minPrefixLength, minFuzzyLength, maxExpansionsPerTerm } = this.config;
    const expansions: Expansion[] = [];
    const exact = this.postings.has(queryTerm);
    if (exact) expansions.push({ term: queryTerm, factor: 1 });

    if (queryTerm.length >= minPrefixLength) {
      let i = lowerBound(this.sortedTerms, queryTerm);
      while (
        i < this.sortedTerms.length &&
        this.sortedTerms[i].startsWith(queryTerm) &&
        expansions.length < maxExpansionsPerTerm
      ) {
        if (this.sortedTerms[i] !== queryTerm) expansions.push({ term: this.sortedTerms[i], factor: prefixFactor });
        i++;
      }
    }

    if (!exact && queryTerm.length >= minFuzzyLength) {
      const maxDistance = queryTerm.length >= 8 ? 2 : 1;
      const seen = new Set(expansions.map((e) => e.term));
      for (let len = queryTerm.length - maxDistance; len <= queryTerm.length + maxDistance; len++) {
        for (const term of this.termsByLength.get(len) ?? []) {
          if (expansions.length >= maxExpansionsPerTerm) break;
          if (seen.has(term)) continue;
          const distance = boundedEditDistance(queryTerm, term, maxDistance);
          if (distance <= maxDistance) {
            expansions.push({ term, factor: fuzzyFactor / distance });
          }
        }
      }
    }

    this.expansionCache.set(queryTerm, expansions);
    return expansions;
  }
}

function lowerBound(sorted: readonly string[], target: string): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
