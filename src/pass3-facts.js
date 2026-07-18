// pass 3 — hand-picked predicates → cleaned 5-column facts.parquet
import { readFile } from 'node:fs/promises'
import { ENGLISH_ONLY, FACTS_PARQUET, FILTERED, INCLUDE_FILE, MAX_OBJ_CHARS, NS } from '../config.js'
import { duckdbCopy, eachLine, q, streamCmd, writePatterns } from './shell.js'
import { clip, csv, gb, lines, log, oneLine, unescapeNT } from './util.js'

export async function pass3(names) {
  log('pass 3 — facts parquet')
  const prefixes = lines(await readFile(INCLUDE_FILE, 'utf8'))
  const patFile = await writePatterns('include', prefixes.map((p) => `\t${p}`))
  const producer = streamCmd(`gzcat ${q(FILTERED)} | rg -a -F -f ${q(patFile)}`)

  // records arrive one-per-line (newlines sentinel-encoded by node), so the
  // parallel csv reader is safe on the pipe; chr(1) → chr(10) restores them
  const { bw, done } = duckdbCopy(`
COPY (
  SELECT subject, predicate, replace(object, chr(1), chr(10)) AS object, subject_name, object_name
  FROM read_csv('/dev/stdin',
    columns = {'subject':'VARCHAR','predicate':'VARCHAR','object':'VARCHAR','subject_name':'VARCHAR','object_name':'VARCHAR'},
    header = false, auto_detect = false, delim = ',', quote = '"', escape = '"',
    nullstr = '')
) TO '${FACTS_PARQUET}' (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE_BYTES '64MB');`)

  let n = 0
  let kept = 0
  let truncated = 0
  await eachLine(producer.stdout, (line) => {
    if (++n % 25_000_000 === 0) log(`  …${n / 1e6}m lines scanned, ${(kept / 1e6).toFixed(1)}m kept`)
    const parts = line.split('\t')
    if (parts.length < 3) return
    const p = parts[1]
    let ok = false // rg matched anywhere in the line — confirm it was the predicate column
    for (let i = 0; i < prefixes.length; i++) {
      if (p.startsWith(prefixes[i])) { ok = true; break }
    }
    if (!ok) return

    const o = parts[2]
    let obj
    let objId = ''
    if (o.charCodeAt(0) === 60 /* < */) {
      if (o.startsWith(NS)) {
        objId = o.slice(NS.length, -1)
        obj = objId
      } else {
        obj = o.slice(1, -1) // external uri, e.g. official_website
      }
    } else if (o.charCodeAt(0) === 34 /* " */) {
      const end = o.lastIndexOf('"')
      if (end < 1) return
      if (o.charCodeAt(end + 1) === 64 /* @ */ && ENGLISH_ONLY && o.slice(end + 2) !== 'en') return
      obj = oneLine(unescapeNT(o.slice(1, end))) // drops "..."@lang and "..."^^<xsd:type> cruft
      if (obj.length > MAX_OBJ_CHARS) {
        obj = obj.slice(0, MAX_OBJ_CHARS)
        truncated++
      }
    } else {
      obj = o
    }
    kept++
    const subj = clip(parts[0])
    const sn = names.get(subj) || ''
    const on = objId ? names.get(objId) || '' : ''
    return bw.write(`${csv(subj)},${csv(p.slice(NS.length, -1))},${csv(obj)},${csv(sn)},${csv(on)}\n`)
  })
  await producer.done
  await bw.end()
  await done
  if (truncated) log(`  note: ${truncated} object values were longer than ${MAX_OBJ_CHARS} chars and got truncated`)
  log(`pass 3 done — ${kept} rows → ${FACTS_PARQUET} (${gb(FACTS_PARQUET)})`)
}
