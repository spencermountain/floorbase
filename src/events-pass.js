// events pass — date predicates → events-unsorted.parquet (streamed, cheap)
// sorting happens afterwards in the sort pass, file→file, where duckdb can spill
import { readFile } from 'node:fs/promises'
import { DATES_FILE, EVENTS_UNSORTED, FILTERED, NS } from '../config.js'
import { duckdbCopy, eachLine, q, streamCmd, writePatterns } from './shell.js'
import { clip, csv, gb, lines, log } from './util.js'

export async function eventsPass(names) {
  log('events parquet (unsorted)')
  const preds = lines(await readFile(DATES_FILE, 'utf8'))
  const predSet = new Set(preds.map((u) => `<${u}>`))
  const patFile = await writePatterns('dates', preds.map((u) => `\t<${u}>\t`))
  const producer = streamCmd(`gzcat ${q(FILTERED)} | rg -a -F -f ${q(patFile)}`)

  const { bw, done } = duckdbCopy(`
COPY (
  SELECT * FROM read_csv('/dev/stdin',
    columns = {'date':'VARCHAR','subject':'VARCHAR','predicate':'VARCHAR','subject_name':'VARCHAR'},
    header = false, auto_detect = false, delim = ',', quote = '"', escape = '"', nullstr = '')
) TO '${EVENTS_UNSORTED}' (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE_BYTES '64MB');`)

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
  log(`events done — ${kept} rows → ${EVENTS_UNSORTED} (${gb(EVENTS_UNSORTED)})`)
}
