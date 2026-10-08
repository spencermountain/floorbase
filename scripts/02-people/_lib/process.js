import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { log } from './log.js'
import { MEMORY_LIMIT, THREADS, MAX_TEMP_DIRECTORY_SIZE } from '../config.js'

const quote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`
const run = (command, args, capture = false) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  if (capture) {
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { output += chunk })
  } else {
    createInterface({ input: child.stdout }).on('line', (line) => log(line, { depth: 1 }))
  }
  createInterface({ input: child.stderr }).on('line', (line) => log(line, { depth: 1, tone: 'yellow' }))
  child.on('error', reject)
  child.on('close', (code) => {
    if (code === 0) {
      resolve(output)
    } else {
      reject(new Error(`${command} exited with ${code}`))
    }
  })
})
const duckdb = (sql, temp, capture = false) => run('duckdb', ['-bail', '-json', '-c', `
SET memory_limit = ${sqlString(MEMORY_LIMIT)};
SET threads = ${THREADS};
SET preserve_insertion_order = false;
SET temp_directory = ${sqlString(temp)};
${MAX_TEMP_DIRECTORY_SIZE ? `SET max_temp_directory_size = ${sqlString(MAX_TEMP_DIRECTORY_SIZE)};` : ''}
${sql}`], capture)
const predicateURI = (property) => {
  if (property.startsWith('key/')) {
    return `<http://rdf.freebase.com/${property}>`
  }
  return `<http://rdf.freebase.com/ns/${property}>`
}
const patterns = (properties) => properties.map((property) => `\t${predicateURI(property)}\t`).join('\n') + '\n'
// rg exit 1 means an empty slice, not a failed pipeline.
const filterCommand = (input, patternFile) => `gzip -dc ${quote(input)} | { rg -a -F -f ${quote(patternFile)}; code=$?; if [ "$code" -gt 1 ]; then exit "$code"; fi; }`

export { quote, sqlString, run, duckdb, predicateURI, patterns, filterCommand }
