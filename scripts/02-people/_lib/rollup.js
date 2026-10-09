import { ENTITY_TYPE, COMPOUNDS, COLUMNS, PROPERTIES, ROW_GROUP_SIZE } from '../config.js'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'
import { duckdb, sqlString } from './process.js'
import { log } from './log.js'

const identifier = (value) => `"${value.replaceAll('"', '""')}"`
const columnSQL = ([name, { path, multiple = false, numeric = false }]) => {
  if (!path?.length || path.length > 2 || path.some((property) => !PROPERTIES.includes(property))) {
    throw new Error(`Invalid property path for ${name}`)
  }
  let source = 'facts f'
  let condition = `f.subject = e.id AND f.predicate = ${sqlString(path[0])}`
  let value = 'f.object'
  if (path.length === 2) {
    source += ' JOIN facts child ON child.subject = f.object'
    condition += ` AND child.predicate = ${sqlString(path[1])}`
    // Use one stable compound node for scalar coordinates; preserve all in JSON.
    if (!multiple) {
      condition += ` AND f.object = (SELECT min(object) FROM facts WHERE subject = e.id AND predicate = ${sqlString(path[0])})`
    }
    value = 'child.object'
  }
  if (numeric) {
    value = `try_cast(${value} AS DOUBLE)`
  }
  let aggregate = `min(${value})`
  if (multiple) {
    aggregate = `list(DISTINCT ${value} ORDER BY ${value})`
  }
  return `(SELECT ${aggregate} FROM ${source} WHERE ${condition}) AS ${identifier(name)}`
}

const csvSource = (path) => `read_csv(${sqlString(path)}, header = true,
  columns = {'subject':'VARCHAR','predicate':'VARCHAR','object':'VARCHAR'},
  auto_detect = false, delim = ',', quote = '"', escape = '"',
  nullstr = '\\N', allow_quoted_nulls = false, max_line_size = 16777216, buffer_size = 33554432)`

const rollup = async (staged, output, work) => {
  const spill = join(work, 'spill')
  const columns = Object.entries(COLUMNS).map(columnSQL)
  const compoundRules = Object.entries(COMPOUNDS).flatMap(([parent, children]) =>
    children.map((child) => `(${sqlString(parent)}, ${sqlString(child)})`)).join(',')
  const children = join(work, 'children.parquet')
  log('Stream compound facts → Parquet (no joins or aggregation)')
  await duckdb(`COPY (SELECT * FROM ${csvSource(staged.children)}) TO ${sqlString(children)}
    (FORMAT PARQUET, COMPRESSION SNAPPY, ROW_GROUP_SIZE ${ROW_GROUP_SIZE});`, spill)
  await rm(staged.children)
  const summary = [{ candidates: 0, excluded_without_english_name: 0 }]
  // Partitioning precedes every join, sort and aggregation. Each process handles one bucket.
  for (let bucket = 0; bucket < staged.buckets.length; bucket++) {
    log(`Select and roll up batch ${bucket + 1}/${staged.buckets.length}`, { depth: 1 })
    const part = join(work, `part-${bucket}.parquet`)
    const stats = JSON.parse(await duckdb(`
CREATE TEMP VIEW raw AS SELECT * FROM ${csvSource(staged.buckets[bucket])};
CREATE TEMP TABLE candidates AS SELECT DISTINCT subject AS id FROM raw
  WHERE predicate = 'type.object.type' AND object = ${sqlString(ENTITY_TYPE)};
CREATE TEMP TABLE entities AS SELECT c.id, min(r.object) AS name
  FROM candidates c JOIN raw r ON r.subject = c.id
  WHERE r.predicate = 'type.object.name' AND length(trim(r.object)) > 0 GROUP BY c.id;
CREATE TEMP TABLE roots AS SELECT DISTINCT r.* FROM raw r JOIN entities e ON e.id = r.subject;
CREATE TEMP TABLE facts AS SELECT * FROM roots
  UNION
  SELECT child.* FROM read_parquet(${sqlString(children)}) child
  JOIN (SELECT DISTINCT r.object AS node, rules.child AS predicate
    FROM roots r JOIN (VALUES ${compoundRules}) rules(link, child) ON r.predicate = rules.link) refs
    ON child.subject = refs.node AND child.predicate = refs.predicate;
DROP VIEW raw;
CREATE TEMP TABLE compound_values AS
  SELECT DISTINCT r.subject AS owner, r.predicate AS link, r.object AS node,
    child.predicate, child.object
  FROM roots r JOIN (VALUES ${compoundRules}) rules(link, child) ON r.predicate = rules.link
  JOIN facts child ON child.subject = r.object AND child.predicate = rules.child;
CREATE TEMP TABLE compounds AS
  SELECT owner, link, node,
    to_json(map_from_entries(list(struct_pack(key := predicate, value := vals) ORDER BY predicate))) AS data
  FROM (SELECT owner, link, node, predicate, list(object ORDER BY object) AS vals
    FROM compound_values GROUP BY owner, link, node, predicate)
  GROUP BY owner, link, node;
DROP TABLE compound_values;
CREATE TEMP TABLE promoted AS SELECT e.id, e.name, ${columns.join(', ')} FROM entities e;
DROP TABLE facts;
CREATE TEMP TABLE payloads AS
  SELECT subject,
    to_json(map_from_entries(list(struct_pack(key := predicate, value := vals) ORDER BY predicate))) AS data
  FROM (
    SELECT r.subject, r.predicate,
      list(CASE WHEN c.node IS NOT NULL THEN to_json(struct_pack(id := r.object, data := c.data))
        ELSE to_json(r.object) END ORDER BY r.object) AS vals
    FROM roots r LEFT JOIN compounds c
      ON c.owner = r.subject AND c.link = r.predicate AND c.node = r.object
    GROUP BY r.subject, r.predicate
  ) GROUP BY subject;
DROP TABLE roots;
DROP TABLE compounds;
COPY (SELECT e.*, CAST(p.data AS VARCHAR) AS data
  FROM promoted e JOIN payloads p ON p.subject = e.id)
TO ${sqlString(part)} (FORMAT PARQUET, COMPRESSION SNAPPY, ROW_GROUP_SIZE ${ROW_GROUP_SIZE});
SELECT (SELECT count(*) FROM candidates) AS candidates,
  (SELECT count(*) FROM candidates) - (SELECT count(*) FROM entities) AS excluded_without_english_name;
`, spill, true))
    summary[0].candidates += stats[0].candidates
    summary[0].excluded_without_english_name += stats[0].excluded_without_english_name
    await rm(staged.buckets[bucket])
  }
  log('Combine completed batches → final Parquet')
  await duckdb(`COPY (SELECT * FROM read_parquet(${sqlString(join(work, 'part-*.parquet'))}))
    TO ${sqlString(output)} (FORMAT PARQUET, COMPRESSION SNAPPY, ROW_GROUP_SIZE ${ROW_GROUP_SIZE});`, spill)
  return summary
}

export default rollup
