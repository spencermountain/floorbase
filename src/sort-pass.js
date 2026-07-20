// sort pass — events-unsorted.parquet → events.parquet, ordered by date
// a pure duckdb job: reading from a seekable parquet file lets the sort spill
// to disk properly, which it cannot do when fed from a pipe
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { EVENTS_PARQUET, EVENTS_UNSORTED } from '../config.js'
import { duckdbRun } from './shell.js'
import { gb, log } from './util.js'

export async function sortPass() {
  if (!existsSync(EVENTS_UNSORTED)) {
    throw new Error(`${EVENTS_UNSORTED} missing — run 'node src/index.js 5' first`)
  }
  log('sorting events parquet')
  await duckdbRun(`
SET preserve_insertion_order = true;
COPY (
  SELECT * FROM '${EVENTS_UNSORTED}' ORDER BY "date"
) TO '${EVENTS_PARQUET}' (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 122880);`)
  await rm(EVENTS_UNSORTED, { force: true })
  log(`sort done — ${EVENTS_PARQUET} (${gb(EVENTS_PARQUET)})`)
}
