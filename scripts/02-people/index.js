import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { FILTERED, OUTPUT, MINUTES, TEMP_DIRECTORY, MAX_TEMP_DIRECTORY_SIZE } from './config.js'
import prepare from '../00-prepare/index.js'
import { heading, log, estimate, complete } from './_lib/log.js'
import rollup from './_lib/rollup.js'
import stage from './_lib/stage.js'
import report from './_lib/report.js'

const build = async () => {
  heading('02 · People')
  await prepare(FILTERED, 1)
  estimate(MINUTES)
  const start = Date.now()
  await mkdir(dirname(OUTPUT), { recursive: true })
  const temp = await mkdtemp(join(dirname(OUTPUT), '.people-'))
  let work = temp
  try {
    await mkdir(TEMP_DIRECTORY, { recursive: true })
    work = await mkdtemp(join(TEMP_DIRECTORY, '.people-work-'))
    log(`Temporary data: ${work}`)
    log(`Spill limit: ${MAX_TEMP_DIRECTORY_SIZE || 'DuckDB automatic (available disk space)'}`, { depth: 1, last: true })
    log('Stream filtered dump → subject partitions')
    const staged = await stage(work)
    const output = join(temp, 'output.parquet')
    log('Roll up named subjects · expand compound records · write Parquet')
    const summary = await rollup(staged, output, work)
    log(`${summary[0].excluded_without_english_name.toLocaleString('en-US')} subjects excluded without an English name`, { depth: 1, last: true })
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
