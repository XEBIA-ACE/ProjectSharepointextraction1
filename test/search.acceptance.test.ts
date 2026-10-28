import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { loadProductCatalog } from '../src/catalog/productCatalog';
import { NO_PRODUCTS_FOUND_MESSAGE, RESPONSE_TIME_BUDGET_MS } from '../src/http/searchRouter';
import { evaluateHitRatio, type RelevanceJudgement } from '../src/search/hitRatio';
import judgements from './fixtures/relevanceJudgements.json';
import { buildApp, buildService, CapturingLogger } from './helpers';

const app = buildApp();

describe('[US-001-AC1] /search/* accepts product name queries and returns relevant products', () => {
  it('[US-001-AC1] returns a list of matching products for a term in the path', async () => {
    const res = await request(app).get('/search/running%20shoes').expect(200);
    assert.equal(res.body.query, 'running shoes');
    assert.ok(Array.isArray(res.body.results));
    assert.ok(res.body.total >= 2);
    const ids = res.body.results.map((p: { id: string }) => p.id);
    assert.deepEqual(ids.slice(0, 2).sort(), ['P-1030', 'P-1031']);
    assert.equal(res.body.message, undefined);
  });

  it('[US-001-AC1] accepts the query via ?q= on any /search/* path', async () => {
    const res = await request(app).get('/search/products').query({ q: 'macbook air' }).expect(200);
    assert.equal(res.body.results[0].id, 'P-1010');
  });

  it('[US-001-AC1] returns product records with id, name, brand, category, price and score', async () => {
    const res = await request(app).get('/search/kindle').expect(200);
    assert.deepEqual(Object.keys(res.body.results[0]).sort(), ['brand', 'category', 'id', 'name', 'price', 'score']);
    assert.equal(res.body.results[0].name, 'Amazon Kindle Paperwhite');
  });

  it('[US-001-AC1] orders results by descending relevance score', async () => {
    const res = await request(app).get('/search/apple').expect(200);
    const scores = res.body.results.map((p: { score: number }) => p.score);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  });

  it('[US-001-AC1] supports limit and offset pagination', async () => {
    const all = await request(app).get('/search/apple').query({ limit: 100 }).expect(200);
    const page = await request(app).get('/search/apple').query({ limit: 2, offset: 1 }).expect(200);
    assert.equal(page.body.total, all.body.total);
    assert.deepEqual(page.body.results, all.body.results.slice(1, 3));
  });

  it('[US-001-AC1] excludes inactive products from results', async () => {
    const res = await request(app).get('/search/iphone').query({ limit: 100 }).expect(200);
    assert.ok(!res.body.results.some((p: { id: string }) => p.id === 'P-1063'));
  });

  it('[US-001-AC1] rejects empty, oversized or non-alphanumeric queries with 400', async () => {
    for (const path of ['/search/', '/search/%20%20', '/search/!!!', `/search/${'a'.repeat(201)}`]) {
      const res = await request(app).get(path).expect(400);
      assert.equal(res.body.error.code, 'INVALID_QUERY', path);
    }
    await request(app).get('/search/x').query({ q: ['a', 'b'] }).expect(400);
    await request(app).get('/search/apple').query({ limit: 0 }).expect(400);
    await request(app).get('/search/apple').query({ limit: 101 }).expect(400);
    await request(app).get('/search/apple').query({ offset: -1 }).expect(400);
    await request(app).get('/search/apple').query({ limit: 'abc' }).expect(400);
  });

  it('[US-001-AC1] sanitises control characters and extra whitespace in the query', async () => {
    const res = await request(app).get('/search/products').query({ q: '  air\u0000\t  fryer  ' }).expect(200);
    assert.equal(res.body.query, 'air fryer');
    assert.equal(res.body.results[0].id, 'P-1042');
  });

  it('[US-001-AC1] does not log the raw search term', async () => {
    const logger = new CapturingLogger();
    await request(buildApp(undefined, logger)).get('/search/secret%20term').expect(200);
    const entry = logger.entries.find((e) => e.event === 'search.request');
    assert.ok(entry);
    assert.equal(entry.queryLength, 'secret term'.length);
    assert.ok(!JSON.stringify(logger.entries).includes('secret'));
  });
});

describe('[US-001-AC2] /search/* returns a "No products found" message when nothing matches', () => {
  it('[US-001-AC2] responds 200 with an empty list and the message', async () => {
    const res = await request(app).get('/search/zzqxv%20flurb').expect(200);
    assert.deepEqual(res.body.results, []);
    assert.equal(res.body.total, 0);
    assert.equal(res.body.message, NO_PRODUCTS_FOUND_MESSAGE);
    assert.equal(res.body.message, 'No products found');
  });

  it('[US-001-AC2] returns the message when the catalog is empty', async () => {
    const res = await request(buildApp([])).get('/search/phone').expect(200);
    assert.equal(res.body.message, 'No products found');
  });

  it('[US-001-AC2] does not return the message when results exist', async () => {
    const res = await request(app).get('/search/xbox').expect(200);
    assert.ok(res.body.total > 0);
    assert.ok(!('message' in res.body));
  });
});

describe('[US-001-AC3] /search/* responds within the 2 second budget', () => {
  it('[US-001-AC3] exposes the server-side duration via the Server-Timing header', async () => {
    const res = await request(app).get('/search/laptop').expect(200);
    const match = /search;dur=([\d.]+)/.exec(res.headers['server-timing']);
    assert.ok(match);
    assert.ok(Number(match[1]) < RESPONSE_TIME_BUDGET_MS);
  });

  it('[US-001-AC3] logs the request duration for monitoring', async () => {
    const logger = new CapturingLogger();
    await request(buildApp(undefined, logger)).get('/search/laptop').expect(200);
    const entry = logger.entries.find((e) => e.event === 'search.request');
    assert.equal(entry?.level, 'info');
    assert.equal(typeof entry?.durationMs, 'number');
    assert.ok((entry?.durationMs as number) < RESPONSE_TIME_BUDGET_MS);
  });
});

describe('[US-001-AC4] /search/* relevance achieves >90% hit-ratio against store data', () => {
  const service = buildService(loadProductCatalog());

  it('[US-001-AC4] hit-ratio@5 over the judged store queries is above 90%', () => {
    const report = evaluateHitRatio(service, judgements as RelevanceJudgement[], 5);
    assert.ok(report.total >= 50, 'judgement set must be representative');
    assert.ok(report.ratio > 0.9, `hit-ratio ${report.ratio} misses: ${JSON.stringify(report.misses)}`);
  });

  it('[US-001-AC4] hit-ratio@1 over the judged store queries is above 90%', () => {
    const report = evaluateHitRatio(service, judgements as RelevanceJudgement[], 1);
    assert.ok(report.ratio > 0.9, `hit-ratio ${report.ratio} misses: ${JSON.stringify(report.misses)}`);
  });

  it('[US-001-AC4] tolerates typos, plurals, casing, diacritics and partial terms', async () => {
    const cases: [string, string][] = [
      ['iphnoe', 'P-1001'],
      ['Air Fryers', 'P-1042'],
      ['HEADPHONES SONY', 'P-1004'],
      ['creme brulee', 'P-1059'],
      ['macb', 'P-1010'],
      ['tshirt', 'P-1035'],
    ];
    for (const [q, expected] of cases) {
      const res = await request(app).get('/search/products').query({ q }).expect(200);
      assert.equal(res.body.results[0]?.id, expected, q);
    }
  });

  it('[US-001-AC4] ranks name matches above description-only matches', async () => {
    const res = await request(app).get('/search/espresso%20machine').expect(200);
    assert.equal(res.body.results[0].id, 'P-1045');
  });
});
