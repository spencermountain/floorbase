// basic sanity queries against data/facts.parquet
//   node scripts/test-facts.js
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { FACTS_PARQUET } from '../config.js'

if (!existsSync(FACTS_PARQUET)) {
  console.error(`${FACTS_PARQUET} not found — run 'node src/index.js 3' first`)
  process.exit(1)
}

const run = (title, sql) => {
  console.log(`\n── ${title}`)
  const t = Date.now()
  const res = spawnSync('duckdb', ['-bail', '-c', sql], { stdio: 'inherit' })
  if (res.status !== 0) process.exit(1)
  console.log(`   (${((Date.now() - t) / 1000).toFixed(1)}s)`)
}

const FACTS = `'${FACTS_PARQUET}'`

run('shape', `
  SELECT count(*) AS rows,
    count(DISTINCT predicate) AS predicates,
    approx_count_distinct(subject) AS subjects
  FROM ${FACTS}`)

run('top predicates', `
  SELECT predicate, count(*) AS n
  FROM ${FACTS}
  GROUP BY predicate ORDER BY n DESC LIMIT 15`)

run('name-join coverage', `
  SELECT round(100.0 * count(subject_name) / count(*), 1) AS pct_subject_named,
    round(100.0 * count(object_name) / count(*), 1) AS pct_object_named
  FROM ${FACTS}`)

run('spot-check — rob ford (m.05bdcg)', `
  SELECT predicate, left(object, 60) AS object, subject_name, object_name
  FROM ${FACTS}
  WHERE subject = 'm.05bdcg' LIMIT 15`)
