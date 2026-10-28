import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { loadProductCatalog } from '../src/catalog/productCatalog';
import { RESPONSE_TIME_BUDGET_MS } from '../src/http/searchRouter';
import type { Product } from '../src/search/types';
import { buildApp } from './helpers';

const ADJECTIVES = ['wireless', 'portable', 'smart', 'compact', 'premium', 'classic', 'ultra', 'pro', 'eco', 'mini'];
const NOUNS = ['speaker', 'headphones', 'laptop', 'camera', 'jacket', 'shoes', 'blender', 'lamp', 'watch', 'backpack'];
const BRANDS = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Soylent', 'Hooli', 'Stark', 'Wayne', 'Wonka', 'Tyrell'];

function syntheticCatalog(size: number): Product[] {
  const products = [...loadProductCatalog()];
  for (let i = 0; i < size; i++) {
    const adjective = ADJECTIVES[i % ADJECTIVES.length];
    const noun = NOUNS[Math.floor(i / ADJECTIVES.length) % NOUNS.length];
    const brand = BRANDS[Math.floor(i / 100) % BRANDS.length];
    products.push({
      id: `S-${i}`,
      name: `${brand} ${adjective} ${noun} model ${i}`,
      brand,
      category: noun,
      description: `A ${adjective} ${noun} by ${brand} with feature set ${i % 37}.`,
      price: 10 + (i % 500),
      tags: [adjective, noun],
    });
  }
  return products;
}

const QUERIES = [
  'wireless speaker',
  'acme laptop',
  'portable camera pro',
  'smart watch',
  'premium jaket',
  'globex',
  'model 4242',
  'headphnes',
  'eco lamp',
  'ultra backpack stark',
  'noise cancelling headphones',
  'zzqxv flurb',
];

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

describe('[US-001-AC3] /search/* performance under typical load', () => {
  const app = buildApp(syntheticCatalog(20_000));

  it('[US-001-AC3] sequential searches over a 20k product catalog complete within 2 seconds', async () => {
    const durations: number[] = [];
    for (let round = 0; round < 5; round++) {
      for (const q of QUERIES) {
        const start = performance.now();
        await request(app).get('/search/products').query({ q, offset: round }).expect(200);
        durations.push(performance.now() - start);
      }
    }
    const max = Math.max(...durations);
    assert.ok(max < RESPONSE_TIME_BUDGET_MS, `max ${max.toFixed(1)}ms, p95 ${percentile(durations, 95).toFixed(1)}ms`);
  });

  it('[US-001-AC3] 50 concurrent searches each complete within 2 seconds', async () => {
    const durations = await Promise.all(
      Array.from({ length: 50 }, async (_, i) => {
        const start = performance.now();
        await request(app)
          .get(`/search/${encodeURIComponent(QUERIES[i % QUERIES.length])}`)
          .query({ offset: i })
          .expect(200);
        return performance.now() - start;
      }),
    );
    const max = Math.max(...durations);
    assert.ok(max < RESPONSE_TIME_BUDGET_MS, `max ${max.toFixed(1)}ms, p95 ${percentile(durations, 95).toFixed(1)}ms`);
  });
});
