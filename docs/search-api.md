# Product search API (`/search/*`) — US-001

Service: SVC-002 User Identity & Access Service. Acceptance criteria: US-001-AC1 … US-001-AC4.

## Request

`GET /search/{term}` or `GET /search/{anything}?q={term}`

| Parameter | Where | Rules |
|-----------|-------|-------|
| `q` | query string (takes precedence) | single string, 1–200 chars after sanitisation |
| `{term}` | path remainder after `/search/` (used when `q` is absent; `/` treated as space) | same as `q` |
| `limit` | query string | integer 1–100, default 20 |
| `offset` | query string | integer 0–10000, default 0 |

The term is sanitised (control characters removed, whitespace collapsed, trimmed) and must contain at least one letter or digit.

## Responses

`200 OK` with matches (US-001-AC1):

```json
{
  "query": "running shoes",
  "total": 2,
  "limit": 20,
  "offset": 0,
  "results": [
    { "id": "P-1030", "name": "Nike Air Zoom Pegasus 40 Running Shoes", "brand": "Nike", "category": "Footwear", "price": 130, "score": 12.3456 }
  ]
}
```

`200 OK` with no matches (US-001-AC2) — `results` is empty and `message` is set:

```json
{ "query": "zzqxv", "total": 0, "limit": 20, "offset": 0, "results": [], "message": "No products found" }
```

`400 Bad Request` for an invalid query/limit/offset: `{ "error": { "code": "INVALID_QUERY", "message": "..." } }`.

Every search response carries a `Server-Timing: search;dur=<ms>` header.

## Relevance algorithm (US-001-AC4)

Implemented in `src/search/productSearchIndex.ts` (tunable through `RelevanceConfig`):

1. **Normalisation** — NFKD + diacritic stripping, lowercase, punctuation removal, stop-word removal, light plural stemming; hyphenated words also index their joined form (`t-shirt` ↔ `tshirt`).
2. **Field-weighted BM25** — name 3, brand 2, category 1.5, tags 1.5, description 0.5 (`k1 = 1.2`, `b = 0.5`).
3. **Term expansion** — prefix matches for type-ahead (×0.7) and, for unknown terms of length ≥ 4, typo matches within edit distance 1 (2 for length ≥ 8) using optimal string alignment (×0.6/distance).
4. **Coverage** — a product must match at least half of the query terms; score is multiplied by coverage².
5. **Phrase boost** — ×1.5 when the query appears contiguously in the product name, a further ×1.2 when the name starts with it.

### Hit-ratio measurement

Hit-ratio@K = share of judged queries for which at least one relevant product is in the top K results (`src/search/hitRatio.ts`). The judgement set is `test/fixtures/relevanceJudgements.json` (82 queries over the bundled store catalog, covering exact names, brand/type combinations, plurals, casing, typos, diacritics and partial terms). The CI test asserts > 90% at K = 5 and K = 1; the current result is 100% for both.

**Store data scope:** active products (`active !== false`) in the catalog loaded from `PRODUCT_CATALOG_PATH`, or the bundled `src/data/products.json` when unset.

## Performance (US-001-AC3)

- The inverted index is built once at start-up; queries touch only postings for the (expanded) query terms.
- Term expansions and full results (keyed by normalised query + paging) are LRU-cached.
- Results are paginated (max 100 per page).
- Each request logs `{ event: "search.request", status, durationMs, queryLength, total }`; requests over the 2 s budget are logged at `warn`. The raw search term is not logged.

**Measurement used in CI** (`test/search.performance.test.ts`): a 20,063-product catalog, 60 sequential searches and 50 concurrent searches through the HTTP layer; every request must complete in < 2 s. "Typical load" is not defined by the specification; this is the working definition until a non-functional performance spec is provided.

## Open gaps (disclosed, not resolved here)

- The work item title/behaviour narrative describes user registration (`POST /auth/register`), but every approved acceptance criterion concerns `/search/*`. Only the search criteria are implemented; registration is out of scope for this change.
- The product record schema, the "No products found" field name and the status code are not defined by the specification; the choices above are working decisions.
- "Typical load conditions", the hit-ratio formula and the scope of "store data" are not defined by the specification; the definitions above are working decisions pending QA/analytics documentation.
- The catalog is an in-memory JSON dataset; the technical design references PostgreSQL but defines no product data model.
- Known artifact gaps for SVC-002: C3 component diagram (`artifact-SVC-002-c3`), C4 code diagram (`artifact-SVC-002-c4`) and API specification (`artifact-SVC-002-api_spec`) have not been generated.
