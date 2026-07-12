// pass 2 — pluck wikipedia en_title lines → in-memory map + json file
import { createWriteStream, existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { finished } from 'node:stream/promises'
import { FILTERED, NAMES_FILE, NS, WIKI_PRED } from '../config.js'
import { BufWriter, eachLine, q, streamCmd, writePatterns } from './shell.js'
import { decodeKey, gb, log, unescapeNT } from './util.js'

export async function pass2() {
  log('pass 2 — wikipedia english names')
  const patFile = await writePatterns('wiki', [`\t${WIKI_PRED}\t`])
  const { stdout, done } = streamCmd(`gzcat ${q(FILTERED)} | rg -a -F -f ${q(patFile)}`)
  const names = new Map()
  let n = 0
  await eachLine(stdout, (line) => {
    const parts = line.split('\t')
    if (parts.length < 3 || parts[1] !== WIKI_PRED || !parts[0].startsWith(NS)) return
    if (++n % 1_000_000 === 0) log(`  …${n / 1e6}m title lines`)
    const id = parts[0].slice(NS.length, -1)
    if (names.has(id)) return // dump is subject-sorted; keep the first title per id
    const o = parts[2]
    const end = o.lastIndexOf('"')
    if (o.charCodeAt(0) !== 34 /* " */ || end < 1) return
    names.set(id, decodeKey(unescapeNT(o.slice(1, end))))
  })
  await done

  const out = createWriteStream(NAMES_FILE)
  const bw = new BufWriter(out)
  let first = true
  let p = bw.write('{\n')
  if (p) await p
  for (const [id, name] of names) {
    p = bw.write(`${first ? '' : ',\n'}${JSON.stringify(id)}:${JSON.stringify(name)}`)
    if (p) await p
    first = false
  }
  p = bw.write('\n}\n')
  if (p) await p
  await bw.end()
  await finished(out)
  log(`pass 2 done — ${names.size} names → ${NAMES_FILE} (${gb(NAMES_FILE)})`)
  return names
}

// standalone steps 3/4 reload the json that pass 2 wrote
export async function loadNames() {
  if (!existsSync(NAMES_FILE)) throw new Error(`${NAMES_FILE} missing — run 'node src/index.js 2' first`)
  const obj = JSON.parse(await readFile(NAMES_FILE, 'utf8'))
  const names = new Map(Object.entries(obj))
  log(`loaded ${names.size} names from ${NAMES_FILE}`)
  return names
}
