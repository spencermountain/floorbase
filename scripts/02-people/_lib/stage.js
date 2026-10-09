import { appendFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { FILTERED, PROPERTIES, COMPOUNDS, BATCH_COUNT } from '../config.js'
import { filterCommand, patterns, predicateURI } from './process.js'
import { csv, parse } from './rdf.js'
import { log } from './log.js'

const bufferSize = 65536
const bucketFor = (subject) => {
  let hash = 0
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) % 4294967296
  }
  return hash % BATCH_COUNT
}
const flush = async (buffer) => {
  if (buffer.size) {
    await appendFile(buffer.path, buffer.parts.join(''))
    buffer.parts = []
    buffer.size = 0
  }
}
const write = async (buffer, line) => {
  buffer.parts.push(line)
  buffer.size += line.length
  if (buffer.size >= bufferSize) {
    await flush(buffer)
  }
}

const stage = async (temp) => {
  if (!Number.isSafeInteger(BATCH_COUNT) || BATCH_COUNT < 1) {
    throw new Error('FLOORBASE_PEOPLE_BATCHES must be a positive integer')
  }
  const buckets = Array.from({ length: BATCH_COUNT }, (_, i) => join(temp, `bucket-${i}.csv`))
  const children = join(temp, 'children.csv')
  const buffers = [...buckets, children].map((path) => ({ path, parts: [], size: 0 }))
  // Bounded buffers, no open file per bucket (important on macOS).
  for (const buffer of buffers) {
    await writeFile(buffer.path, 'subject,predicate,object\n')
  }
  const childProperties = new Set(Object.values(COMPOUNDS).flat())
  const patternFile = join(temp, 'properties.txt')
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
  const consume = async () => {
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity })
    for await (const line of lines) {
      const row = parse(line, predicates)
      if (row) {
        const record = csv(row)
        await write(buffers[bucketFor(row[0])], record)
        if (childProperties.has(row[1])) {
          await write(buffers[BATCH_COUNT], record)
        }
      }
    }
    for (const buffer of buffers) {
      await flush(buffer)
    }
  }
  const consuming = consume()
  try {
    await Promise.all([consuming, done])
  } finally {
    child.kill()
    await Promise.allSettled([consuming, done])
  }
  return { buckets, children }
}

export default stage
