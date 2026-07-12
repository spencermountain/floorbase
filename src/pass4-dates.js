// pass 4 — date predicates → dates.parquet, sorted by date for range queries
import { readFile } from 'node:fs/promises'
import { DATES_FILE, DATES_PARQUET, FILTERED, NS } from '../config.js'
import { duckdbCopy, eachLine, q, streamCmd, writePatterns } from './shell.js'
import { clip, csv, gb, lines, log } from './util.js'

export async function pass4(names) {
  log('pass 4 — dates parquet')
  const preds = lines(await readFile(DATES_FILE, 'utf8'))
  const predSet = new Set(preds.map((u) => `<${u}>`))
  const patFile = await writePatterns('dates', preds.map((u) => `\t<${u}>\t`))
  const producer = streamCmd(`gzcat ${q(FILTERED)} | rg -a -F -f ${q(patFile)}`)

  const { bw, done } = duckdbCopy(`
COPY (
  SELECT * FROM read_csv('/dev/stdin',
    columns = {'date':'VARCHAR','subject':'VARCHAR','predicate':'VARCHAR','subject_name':'VARCHAR'},
    header = false, auto_detect = false, delim = ',', quote = '"', escape = '"', nullstr = '')
  ORDER BY "date"
) TO '${DATES_PARQUET}' (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 122880);`)

  let kept = 0
  await eachLine(producer.stdout, (line) => {
    const parts = line.split('\t')
    if (parts.length < 3 || !predSet.has(parts[1])) return
    const o = parts[2]
    if (o.charCodeAt(0) !== 34 /* " */) return
    const end = o.lastIndexOf('"')
    if (end < 1) return
    if (++kept % 10_000_000 === 0) log(`  …${kept / 1e6}m date rows`)
    const date = o.slice(1, end) // "1969-05-28"^^<xsd:date> → 1969-05-28
    const subj = clip(parts[0])
    const sn = names.get(subj) || ''
    return bw.write(`${csv(date)},${csv(subj)},${csv(parts[1].slice(NS.length, -1))},${csv(sn)}\n`)
  })
  await producer.done
  await bw.end()
  await done
  log(`pass 4 done — ${kept} rows → ${DATES_PARQUET} (${gb(DATES_PARQUET)})`)
}
