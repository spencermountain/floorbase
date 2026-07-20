// basic sanity queries against data/people.parquet
//   node scripts/test-people.js
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { PEOPLE_PARQUET } from '../config.js'

if (!existsSync(PEOPLE_PARQUET)) {
  console.error(`${PEOPLE_PARQUET} not found — run 'node src/index.js 3' first`)
  process.exit(1)
}

const run = (title, sql) => {
  console.log(`\n── ${title}`)
  const t = Date.now()
  const res = spawnSync('duckdb', ['-bail', '-c', sql], { stdio: 'inherit' })
  if (res.status !== 0) process.exit(1)
  console.log(`   (${((Date.now() - t) / 1000).toFixed(1)}s)`)
}

const PEOPLE = `'${PEOPLE_PARQUET}'`

run('shape', `
  SELECT count(*) AS rows,
    count(DISTINCT predicate) AS predicates,
    approx_count_distinct(subject) AS subjects
  FROM ${PEOPLE}`)

run('top predicates', `
  SELECT predicate, count(*) AS n
  FROM ${PEOPLE}
  GROUP BY predicate ORDER BY n DESC LIMIT 15`)

run('name-join coverage', `
  SELECT round(100.0 * count(subject_name) / count(*), 1) AS pct_subject_named,
    round(100.0 * count(object_name) / count(*), 1) AS pct_object_named
  FROM ${PEOPLE}`)

run('spot-check — rob ford (m.05bdcg)', `
  SELECT predicate, left(object, 60) AS object, subject_name, object_name
  FROM ${PEOPLE}
  WHERE subject = 'm.05bdcg' LIMIT 15`)
