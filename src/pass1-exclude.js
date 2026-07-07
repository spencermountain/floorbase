// pass 1 — strip unwanted predicates from the raw dump → smaller gzip
import { readFile } from 'node:fs/promises'
import { DUMP, EXCLUDE_FILE, FILTERED } from './config.js'
import { hasPigz, q, shell, writePatterns } from './shell.js'
import { gb, lines, log } from './util.js'

export async function pass1() {
  log(`pass 1 — exclude filter → ${FILTERED}`)
  // anchor each predicate to column 2 with real tabs so subjects/objects can't match
  const pats = lines(await readFile(EXCLUDE_FILE, 'utf8')).map((p) => `\t${p}\t`)
  const patFile = await writePatterns('exclude', pats)
  const zip = hasPigz() ? 'pigz' : 'gzip -1'
  await shell(`gzcat ${q(DUMP)} | rg -a -v -F -f ${q(patFile)} | ${zip} > ${q(FILTERED)}`)
  log(`pass 1 done — ${gb(DUMP)} → ${gb(FILTERED)}`)
}
