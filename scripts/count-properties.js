import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const file = resolve(homedir(), 'Desktop/freebase-rdf-latest.gz')

console.log(`counting properties`)
const cmd = `time (gzcat ${JSON.stringify(file)} | awk -F' ' '{c[$2]++} END {for (p in c) print c[p], p}' | sort -rn > output.txt)`

spawn(cmd, { shell: true, stdio: ['ignore', 'inherit', 'inherit'] })

