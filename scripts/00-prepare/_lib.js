import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { log } from './_lib/log.js'

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
const shell = (command) => run('bash', ['-o', 'pipefail', '-c', command])
const predicateURI = (property) => {
  if (property.startsWith('key/')) {
    return `<http://rdf.freebase.com/${property}>`
  }
  return `<http://rdf.freebase.com/ns/${property}>`
}
const patterns = (properties) => properties.map((property) => `\t${predicateURI(property)}\t`).join('\n') + '\n'
// rg exit 1 means an empty slice, not a failed pipeline.
const filterCommand = (input, patternFile) => `gzip -dc ${quote(input)} | { rg -a -F -f ${quote(patternFile)}; code=$?; if [ "$code" -gt 1 ]; then exit "$code"; fi; }`

export { quote, sqlString, run, shell, predicateURI, patterns, filterCommand }
