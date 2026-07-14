// basic sanity queries against data/dates.parquet
//   node scripts/test-dates.js
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { DATES_PARQUET } from '../config.js'

if (!existsSync(DATES_PARQUET)) {
  console.error(`${DATES_PARQUET} not found — run 'node src/index.js 4' first`)
  process.exit(1)
}

const run = (title, sql) => {
  console.log(`\n── ${title}`)
  const t = Date.now()
  const res = spawnSync('duckdb', ['-bail', '-c', sql], { stdio: 'inherit' })
  if (res.status !== 0) process.exit(1)
  console.log(`   (${((Date.now() - t) / 1000).toFixed(1)}s)`)
}

const DATES = `'${DATES_PARQUET}'`

run('shape', `
  SELECT count(*) AS rows, min("date") AS first, max("date") AS last
  FROM ${DATES}`)

// range requests rely on row-group min/max stats being in order —
// each group's min must not fall below the previous group's max. expect 0.
run('sortedness (via row-group stats)', `
  WITH rg AS (
    SELECT row_group_id, stats_min, stats_max
    FROM parquet_metadata(${DATES})
    WHERE path_in_schema = 'date'
  )
  SELECT count(*) AS out_of_order_row_groups
  FROM (SELECT stats_min, lag(stats_max) OVER (ORDER BY row_group_id) AS prev_max FROM rg)
  WHERE prev_max IS NOT NULL AND stats_min < prev_max`)

// string comparison makes year prefixes work as a range: '1969' <= '1969-05-28' < '1970'
run('range query — everything dated 1969', `
  SELECT count(*) AS rows_in_1969 FROM ${DATES}
  WHERE "date" >= '1969' AND "date" < '1970'`)

run('sample — first rows of 1969', `
  SELECT * FROM ${DATES}
  WHERE "date" >= '1969' AND "date" < '1970'
  LIMIT 10`)
