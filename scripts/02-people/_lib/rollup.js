import { ENTITY_TYPE, COMPOUNDS, COLUMNS, PROPERTIES, ROW_GROUP_SIZE } from '../config.js'
import { sqlString } from './process.js'

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

const rollup = (source, output) => {
  const columns = Object.entries(COLUMNS).map(columnSQL)
  const compoundRules = Object.entries(COMPOUNDS).flatMap(([parent, children]) =>
    children.map((child) => `(${sqlString(parent)}, ${sqlString(child)})`)).join(',')
  return `
CREATE TEMP TABLE facts AS SELECT DISTINCT * FROM ${source};
CREATE TEMP TABLE candidates AS
  SELECT DISTINCT subject AS id FROM facts
  WHERE predicate = 'type.object.type' AND object = ${sqlString(ENTITY_TYPE)};
CREATE TEMP TABLE entities AS
  SELECT candidates.id, min(f.object) AS name FROM candidates
  JOIN facts f ON f.subject = candidates.id
  WHERE f.predicate = 'type.object.name' AND length(trim(f.object)) > 0
  GROUP BY candidates.id;
CREATE TEMP TABLE roots AS SELECT f.* FROM facts f JOIN entities e ON e.id = f.subject;
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
COPY (SELECT e.id, e.name, ${columns.join(', ')}, CAST(p.data AS VARCHAR) AS data
  FROM entities e JOIN payloads p ON p.subject = e.id)
TO ${sqlString(output)} (FORMAT PARQUET, COMPRESSION SNAPPY, ROW_GROUP_SIZE ${ROW_GROUP_SIZE});
SELECT (SELECT count(*) FROM candidates) AS candidates,
  (SELECT count(*) FROM candidates) - (SELECT count(*) FROM entities) AS excluded_without_english_name;
`
}

export default rollup
