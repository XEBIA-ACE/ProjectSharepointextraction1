import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { boundedEditDistance } from '../src/search/editDistance';
import { LruCache } from '../src/search/lruCache';
import { ProductSearchIndex } from '../src/search/productSearchIndex';
import { ProductSearchService } from '../src/search/productSearchService';
import { normalizeText, stem, tokenize } from '../src/search/textNormalizer';
import type { Product } from '../src/search/types';

const product = (id: string, name: string, extra: Partial<Product> = {}): Product => ({
  id,
  name,
  brand: '',
  category: '',
  description: '',
  price: 1,
  ...extra,
});

describe('[US-001-AC4] text normalisation', () => {
  it('strips diacritics, punctuation and casing', () => {
    assert.equal(normalizeText('Crème  Brûlée!'), 'creme brulee');
  });

  it('stems common plural forms', () => {
    assert.equal(stem('shoes'), 'shoe');
    assert.equal(stem('batteries'), 'battery');
    assert.equal(stem('boxes'), 'box');
    assert.equal(stem('glasses'), 'glass');
    assert.equal(stem('bus'), 'bus');
    assert.equal(stem('4ks'), '4ks');
  });

  it('removes stop words and emits joined forms for hyphenated words', () => {
    assert.deepEqual(tokenize('The T-Shirt for men'), ['t', 'shirt', 'tshirt', 'men']);
  });
});

describe('[US-001-AC4] bounded edit distance', () => {
  it('handles substitutions, insertions, deletions and transpositions', () => {
    assert.equal(boundedEditDistance('phone', 'phone', 1), 0);
    assert.equal(boundedEditDistance('phone', 'phane', 1), 1);
    assert.equal(boundedEditDistance('phone', 'phones', 1), 1);
    assert.equal(boundedEditDistance('iphnoe', 'iphone', 1), 1);
    assert.equal(boundedEditDistance('phone', 'table', 1), 2);
    assert.equal(boundedEditDistance('a', 'abcd', 1), 2);
  });
});

describe('[US-001-AC3] LRU cache', () => {
  it('evicts least recently used entries', () => {
    const cache = new LruCache<string, number>(2, 1000);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    assert.equal(cache.get('b'), undefined);
    assert.equal(cache.get('a'), 1);
    assert.equal(cache.size, 2);
  });

  it('expires entries after the TTL', () => {
    let now = 0;
    const cache = new LruCache<string, number>(10, 100, () => now);
    cache.set('a', 1);
    now = 99;
    assert.equal(cache.get('a'), 1);
    now = 200;
    assert.equal(cache.get('a'), undefined);
  });
});

describe('[US-001-AC1][US-001-AC4] product search index', () => {
  const products = [
    product('1', 'Red Running Shoes', { category: 'Footwear' }),
    product('2', 'Blue Running Shoes', { category: 'Footwear' }),
    product('3', 'Red Coffee Mug', { category: 'Kitchen' }),
    product('4', 'Trail Shoes', { description: 'great for running on trails' }),
    product('5', 'Retired Red Shoes', { active: false }),
  ];
  const index = new ProductSearchIndex(products);

  it('ranks products matching all terms highest', () => {
    const { hits } = index.search('red running shoes', { limit: 10, offset: 0 });
    assert.equal(hits[0].product.id, '1');
    assert.ok(!hits.some((h) => h.product.id === '3'), 'one of three terms is not enough');
  });

  it('weights name matches above description matches', () => {
    const ids = index.search('running', { limit: 10, offset: 0 }).hits.map((h) => h.product.id);
    assert.ok(ids.indexOf('4') > ids.indexOf('1'));
    assert.ok(ids.indexOf('4') > ids.indexOf('2'));
  });

  it('skips inactive products', () => {
    assert.equal(index.size, 4);
  });

  it('matches prefixes and typos', () => {
    assert.equal(index.search('coff', { limit: 1, offset: 0 }).hits[0].product.id, '3');
    assert.equal(index.search('runing', { limit: 10, offset: 0 }).total, 3);
  });

  it('returns no hits for unknown or stop-word-only queries', () => {
    assert.equal(index.search('qwertyuiop', { limit: 10, offset: 0 }).total, 0);
    assert.equal(index.search('the', { limit: 10, offset: 0 }).total, 0);
  });

  it('service caches results keyed by normalised query', () => {
    const service = new ProductSearchService(index);
    const first = service.search('Red Shoes', { limit: 5, offset: 0 });
    const second = service.search('  red   shoes ', { limit: 5, offset: 0 });
    assert.equal(first, second);
  });
});
