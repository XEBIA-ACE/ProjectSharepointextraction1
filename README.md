# ProjectSharepointextraction1

SVC-002 User Identity & Access Service (Node.js + TypeScript + Express).

## Product search (US-001)

`GET /search/{term}` or `GET /search/{anything}?q={term}` — see [docs/search-api.md](docs/search-api.md).

```bash
npm install
npm test          # unit, acceptance (US-001-AC1..AC4) and performance tests
npm run build && npm start   # PORT (default 3000), PRODUCT_CATALOG_PATH (optional JSON catalog)
```
