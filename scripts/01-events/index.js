import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { FILTERED, OUTPUT, MINUTES, TEMP_DIRECTORY, MAX_TEMP_DIRECTORY_SIZE, ROW_GROUP_SIZE } from './config.js'
import prepare from '../00-prepare/index.js'
import { duckdb, sqlString } from './_lib/process.js'
import { heading, log, estimate, complete } from './_lib/log.js'
import stage from './_lib/stage.js'
import report from './_lib/report.js'

const build = async () => {
  heading('01 · Events')
  await prepare(FILTERED, 1)
  estimate(MINUTES)
  const start = Date.now()
  await mkdir(dirname(OUTPUT), { recursive: true })
  const temp = await mkdtemp(join(dirname(OUTPUT), '.events-'))
  let work = temp
  try {
    await mkdir(TEMP_DIRECTORY, { recursive: true })
    work = await mkdtemp(join(TEMP_DIRECTORY, '.events-work-'))
    log(`Temporary data: ${work}`)
    log(`Spill limit: ${MAX_TEMP_DIRECTORY_SIZE || 'DuckDB automatic (available disk space)'}`, { depth: 1, last: true })
    log('Scan filtered dump → temporary CSV')
    const csvFile = await stage(work)
    const source = `read_csv(${sqlString(csvFile)}, header = true,
      columns = {'subject':'VARCHAR','predicate':'VARCHAR','object':'VARCHAR'},
      auto_detect = false, delim = ',', quote = '"', escape = '"',
      nullstr = '\\N', allow_quoted_nulls = false, max_line_size = 16777216)`
    const query = `SELECT *, object AS date FROM ${source} ORDER BY date, subject, predicate`
    const output = join(temp, 'output.parquet')
    log('Write Parquet · Snappy compression')
    await duckdb(`COPY (${query}) TO ${sqlString(output)}
      (FORMAT PARQUET, COMPRESSION SNAPPY, ROW_GROUP_SIZE ${ROW_GROUP_SIZE});`, join(work, 'spill'))
    await rename(output, OUTPUT)
    await report(join(work, 'spill'))
    complete(`Finished in ${((Date.now() - start) / 60000).toFixed(1)} minutes → ${OUTPUT}`)
  } finally {
    if (work !== temp) {
      await rm(work, { recursive: true, force: true })
    }
    await rm(temp, { recursive: true, force: true })
  }
}

await build().catch((error) => {
  log(error.message, { last: true, tone: 'red' })
  process.exitCode = 1
})
