

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const file = resolve(homedir(), 'Desktop/freebase-rdf-latest.gz')

let include = new Set([
  'http://rdf.freebase.com/ns/people.person.date_of_birth',
  'http://rdf.freebase.com/key/wikipedia.en',
  'http://rdf.freebase.com/ns/common.topic.official_website',
])

// one source of truth → rg pattern file, tab-anchored to column 2
const patternFile = './include.txt'
await writeFile(
  patternFile,
  [...include].map(p => `\t${p}\t`).join('\n') + '\n'
)

// rg: fixed strings (-F), invert (-v), patterns from file (-f)
const cmd = `gzcat ${file} | rg -F -f ${patternFile}`
console.log(cmd)
const proc = spawn('sh', ['-c', cmd])

const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity })

for await (const line of rl) {
  const tab1 = line.indexOf('\t')
  const tab2 = line.indexOf('\t', tab1 + 1)
  const predicate = line.slice(tab1 + 1, tab2)
  if (include.has(predicate)) {   // exact backstop
    // keep line;
    console.log(line)
  }
}