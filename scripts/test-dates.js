// basic sanity queries against data/dates.parquet
//   node scripts/test-dates.js
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { DATES_PARQUET } from '../config.js'

if (!existsSync(DATES_PARQUET)) {
  console.error(`${DATES_PARQUET} not found — run 'node src/index.js 4' first`)
  process.exit(1)
}

const run = (sql) => {
  const t = Date.now()
  const res = spawnSync('duckdb', ['-bail', '-c', '.maxrows 534', '-c', sql], { stdio: 'inherit' })
  if (res.status !== 0) process.exit(1)
  console.log(`   (${((Date.now() - t) / 1000).toFixed(1)}s)`)
}

const DATES = `'${DATES_PARQUET}'`



run(`SELECT * FROM ${DATES}
  WHERE "date" >= '1986-03' AND "date" < '1986-04' AND subject_name IS NOT  NULL
  `)
