// basic sanity queries against data/locations.parquet
//   node scripts/test-locations.js
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { LOCATIONS_PARQUET } from '../config.js'

if (!existsSync(LOCATIONS_PARQUET)) {
  console.error(`${LOCATIONS_PARQUET} not found — run 'node src/index.js 4' first`)
  process.exit(1)
}

const run = (title, sql) => {
  console.log(`\n── ${title}`)
  const t = Date.now()
  const res = spawnSync('duckdb', ['-bail', '-c', sql], { stdio: 'inherit' })
  if (res.status !== 0) process.exit(1)
  console.log(`   (${((Date.now() - t) / 1000).toFixed(1)}s)`)
}

const LOCATIONS = `'${LOCATIONS_PARQUET}'`

run('shape', `
  SELECT count(*) AS rows,
    count(DISTINCT predicate) AS predicates,
    approx_count_distinct(subject) AS subjects
  FROM ${LOCATIONS}`)

run('top predicates', `
  SELECT predicate, count(*) AS n
  FROM ${LOCATIONS}
  GROUP BY predicate ORDER BY n DESC LIMIT 15`)

run('name-join coverage', `
  SELECT round(100.0 * count(subject_name) / count(*), 1) AS pct_subject_named,
    round(100.0 * count(object_name) / count(*), 1) AS pct_object_named
  FROM ${LOCATIONS}`)

run('spot-check — toronto (m.0h7h6)', `
  SELECT predicate, left(object, 60) AS object, subject_name, object_name
  FROM ${LOCATIONS}
  WHERE subject = 'm.0h7h6' LIMIT 15`)
