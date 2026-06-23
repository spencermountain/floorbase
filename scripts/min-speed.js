import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const file = resolve(homedir(), 'Desktop/freebase-rdf-latest.gz')
const cmd = `time gzcat ${JSON.stringify(file)} > /dev/null`
const result = spawnSync(cmd, { shell: true, stdio: ['ignore', 'inherit', 'inherit'] })
console.log(result.stdout)