import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const file = resolve(homedir(), 'Desktop/freebase-rdf-latest.gz')

console.log('checking subject blocks (no subject may reappear after moving on)')
const cmd = `time (gzcat ${JSON.stringify(file)} | awk '
  /^#/ { next }
  /^[[:space:]]*$/ { next }

  {
    s = $1
    if (s in closed) {
      print "NOT SORTED: subject reappears at line " NR ": " s > "/dev/stderr"
      exit 1
    }
    if (prev != "" && s != prev) closed[prev] = 1
    prev = s
    triples++
  }

  END {
    if (triples == 0) {
      print "No data rows found (after skipping # headers)" > "/dev/stderr"
      exit 2
    }
    print "SORTED (" triples " triples, contiguous subject blocks)"
  }
')`

spawn(cmd, { shell: true, stdio: ['ignore', 'inherit', 'inherit'] })
