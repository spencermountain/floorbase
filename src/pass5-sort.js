// pass 5 — sort dates-unsorted.parquet by date → dates.parquet
// a pure duckdb job: reading from a seekable parquet file lets the sort spill
// to disk properly, which it cannot do when fed from a pipe
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { DATES_PARQUET, DATES_UNSORTED } from '../config.js'
import { duckdbRun } from './shell.js'
import { gb, log } from './util.js'

export async function pass5() {
  if (!existsSync(DATES_UNSORTED)) {
    throw new Error(`${DATES_UNSORTED} missing — run 'node src/index.js 4' first`)
  }
  log('pass 5 — sorting dates parquet')
  await duckdbRun(`
SET preserve_insertion_order = true;
COPY (
  SELECT * FROM '${DATES_UNSORTED}' ORDER BY "date"
) TO '${DATES_PARQUET}' (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 122880);`)
  await rm(DATES_UNSORTED, { force: true })
  log(`pass 5 done — sorted → ${DATES_PARQUET} (${gb(DATES_PARQUET)})`)
}
