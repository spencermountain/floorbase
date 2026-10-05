# floorbase

Small, configurable slices of the [Freebase RDF dump](https://developers.google.com/freebase) in Parquet, with a fluent [hyparquet](https://github.com/hyparam/hyparquet) reader for Node 18+ and browsers.

## Build

Install JavaScript dependencies with `pnpm install`. Building requires Node 18+, Bash, gzip, ripgrep (`rg`) and the DuckDB CLI on PATH. Reading the outputs only requires JavaScript and hyparquet.

Each numbered script folder owns its `config.js`, implementation and helpers. Edit that folder’s configuration for its paths, exact property whitelist, resource limits, report size and runtime estimate. `00-prepare/config.js` combines the four whitelists; it owns preparation settings. The root `config.js` only re-exports paths for scratch and legacy diagnostics. Your dump defaults to `/Volumes/4TB/data/freebase/freebase-rdf-latest.gz`. Override paths with `FLOORBASE_DUMP`, `FLOORBASE_FILTERED` and `FLOORBASE_DATA`.

```sh
pnpm run:prepare    # optional: every slice invokes this automatically
pnpm run:events
pnpm run:people
pnpm run:locations
pnpm run:wikipedia
pnpm run:all        # all four, sequentially
pnpm scratch       # examples using the configured output directory
```

| Directory | Output | Planning estimate |
| --- | --- | --- |
| `scripts/00-prepare` | `freebase-filtered.gz` | 60–240 min once; immediate if present |
| `scripts/01-events` | `data/events.parquet` | 20–90 min |
| `scripts/02-people` | `data/people.parquet` | 30–120 min |
| `scripts/03-locations` | `data/locations.parquet` | 20–90 min |
| `scripts/04-wikipedia` | `data/wikipedia.parquet` | 30–120 min |

These are **unbenchmarked wall-clock estimates**, for a roughly 30 GB compressed full dump on a 4–8 core laptop with 16 GB RAM and an SSD. Each slice includes scanning, staging, Parquet writing and the count query; add preparation time if needed. All four take roughly 100–420 minutes after preparation. External hard drives, larger whitelists and limited RAM can take substantially longer. Commands print estimates before work and elapsed slice time afterwards.

Preparation retains the union of all configured properties and skips whenever `freebase-filtered.gz` exists. It does not require the raw dump when skipping. If you add properties, move the old filtered file aside and run preparation again; existing caches are trusted and may lack newly selected properties. A temporary gzip is renamed only after a successful scan.

Slices scan the filtered gzip independently. A temporary CSV and DuckDB spill files live beside the output and are cleaned up after each run. Allow tens of GB of free space (potentially 50–100 GB for staging types, spill and outputs), in addition to the raw dump. DuckDB defaults to 4 GB and four threads. Parquet uses Snappy and 122,880-row groups for direct hyparquet compatibility. A completed file replaces the previous output only after conversion succeeds.

After every build, DuckDB reads the finished Parquet and prints its total row count and property counts in descending order. By default every whitelist entry is shown, including zero counts. Set `REPORT_TOP_K` to a positive integer to shorten the report.

## Data

- **Events:** `subject`, `predicate`, `object`, `date`. Birth/death, event start/end, founding/dissolution, and major publication/release dates. `date` is the original lexical value, also retained in `object`; rows are sorted lexically by date. Partial dates remain strings, and lexical sorting is not a complete historical calendar ordering.
- **People:** `subject`, `predicate`, `object`. Birth/death, nationality, profession, gender, languages and immediate family links.
- **Locations:** `subject`, `predicate`, `object`. Containment, capitals, country codes, languages, area, coordinates and population. Geolocation and dated population point to compound-value nodes; the whitelist includes latitude/longitude and number/year properties to follow those references by subject. Shared compound-node properties can also describe non-location entities.
- **Wikipedia:** only `page_id`, `type`, both strings. One distinct English page ID / Freebase type association per row, joined through the Freebase subject. Only `key/wikipedia.en_id` and `type.object.type` are selected. Titles, other languages, invalid page IDs and pages with no type are excluded. Multiple types produce multiple rows per page. Its property report counts populated output associations, rather than raw source triples.

Selection is by exact property, not entity classification or prefix. Freebase IDs and types are shortened (`m.05bdcg`, `people.person`); literals are decoded and non-English language-tagged values are skipped by default. Entity references remain IDs; names are not joined. The old name-based diagnostic scripts are retained unchanged and do not apply to these new schemas.

## Query

```js
import floorbase from './src/index.js'

const db = floorbase('./data')

const events = await db.events()
  .where('predicate', 'people.person.date_of_birth')
  .where('date', date => date.startsWith('1986-03'))
  .select('subject', 'date').limit(10).all()

const people = await db.people()
  .where('predicate', 'people.person.profession')
  .select('subject', 'object').limit(10).all()

const locations = await db.locations()
  .where('predicate', 'location.country.capital')
  .select('subject', 'object').limit(10).all()

const wikipedia = await db.wikipedia()
  .where('type', 'people.person')
  .select('page_id', 'type').limit(10).all()
```

Queries are immutable. `.where(column, value)` uses strict equality; pass a synchronous predicate function for other comparisons. Repeated filters are ANDed. `.limit(n)` applies after filtering. `.select(...columns)` projects output columns while retaining columns needed by filters during reading.

```js
const count = await db.people().where('predicate', 'people.person.profession').count()
const top = await db.locations().top('predicate', 12) // [{ value, count }]
for await (const row of db.wikipedia().where('type', 'people.person').rows()) {
  console.log(row)
}
```

Reading decodes one row group at a time. Filters run in JavaScript; they do not use Parquet statistics to skip groups. `.all()` collects all matching rows, so use `.limit()` or `.rows()` for large results. `.count()` and `.top()` honor filters and limits; `.top()` holds one counter per distinct value and overrides the projection to read its grouping column.

For browsers, use a bundler and an HTTP base URL, e.g. `floorbase('https://example.org/data')`. The server must support range requests and cross-origin access where needed. You can also supply a map of file paths, HTTP URLs, ArrayBuffers or hyparquet AsyncBuffers: `floorbase({ people: buffer })`. The reader does not import the Node-only build configuration.

MIT
