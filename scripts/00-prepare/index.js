import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { DUMP, FILTERED, PREPARE_MINUTES, PROPERTIES } from './config.js'
import { heading, log, estimate, complete } from './_lib/log.js'
import { filterCommand, patterns, quote, shell } from './_lib.js'

const prepare = async (filtered = FILTERED, depth = 0) => {
  if (depth === 0) {
    heading('00 · Prepare')
  }
  if (existsSync(filtered)) {
    complete('Prepare skipped · filtered dump already exists', depth)
    return
  }
  log('Prepare · filter and compress the raw dump', { depth, tone: 'cyan' })
  estimate(PREPARE_MINUTES, depth + 1)
  const start = Date.now()
  await mkdir(dirname(filtered), { recursive: true })
  const temp = await mkdtemp(join(dirname(filtered), '.floorbase-prepare-'))
  try {
    const patternFile = join(temp, 'properties.txt')
    const output = join(temp, 'filtered.gz')
    await writeFile(patternFile, patterns(PROPERTIES))
    await shell(`${filterCommand(DUMP, patternFile)} | gzip -1 > ${quote(output)}`)
    await rename(output, filtered)
    complete(`Prepared ${filtered} · ${((Date.now() - start) / 60000).toFixed(1)} min`, depth + 1)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}

export default prepare
