import { createWriteStream } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { pipeline } from 'node:stream/promises'
import { FILTERED, PROPERTIES } from '../config.js'
import { filterCommand, patterns, predicateURI } from './process.js'
import { csv, parse } from './rdf.js'
import { log } from './log.js'

const stage = async (temp) => {
  const patternFile = join(temp, 'properties.txt')
  const csvFile = join(temp, 'triples.csv')
  await writeFile(patternFile, patterns(PROPERTIES))
  const predicates = new Map(PROPERTIES.map((property) => [predicateURI(property), property]))
  const child = spawn('bash', ['-o', 'pipefail', '-c', filterCommand(FILTERED, patternFile)], { stdio: ['ignore', 'pipe', 'pipe'] })
  createInterface({ input: child.stderr }).on('line', (line) => log(line, { depth: 1, tone: 'yellow' }))
  const done = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`filtered scan exited with ${code}`))
      }
    })
  })
  const rows = async function* () {
    yield 'subject,predicate,object\n'
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity })
    for await (const line of lines) {
      const row = parse(line, predicates)
      if (row) {
        yield csv(row)
      }
    }
  }
  try {
    await Promise.all([pipeline(rows(), createWriteStream(csvFile)), done])
  } finally {
    child.kill()
  }
  return csvFile
}

export default stage
