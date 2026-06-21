import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const start = Math.floor(Math.random() * 1_000_000)
const size = 25
const file = resolve(homedir(), 'Desktop/freebase-rdf-latest.gz')

console.log(`peeking from line ${start} to ${start + size}`)
const end = start + size
const cmd = `gzcat ${JSON.stringify(file)} | sed -n '${start},${end}p'`

spawn(cmd, { shell: true, stdio: ['ignore', 'inherit', 'inherit'] })

setTimeout(() => {
  console.log('done')
  process.exit(0)
}, 500)