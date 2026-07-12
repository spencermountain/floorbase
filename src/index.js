// floorbase — freebase rdf dump → filtered gzip → wikipedia names → two parquet files
//
// usage:
//   node src/index.js        run the full pipeline (~1hr on the 32gb dump)
//   node src/index.js 1      exclude pass only   (dump.gz → filtered.gz)
//   node src/index.js 2      wikipedia names only (filtered.gz → data/wikipedia-names.json)
//   node src/index.js 3      facts parquet only   (needs steps 1 + 2)
//   node src/index.js 4      dates parquet only   (needs steps 1 + 2)
//
// the full run deletes data/wikipedia-names.json when finished; single-step runs keep it.
// paths can be overridden with env vars — see config.js

import { mkdir, rm } from 'node:fs/promises'
import { DATA, DATES_PARQUET, FACTS_PARQUET, NAMES_FILE } from '../config.js'
import { pass1 } from './pass1-exclude.js'
import { loadNames, pass2 } from './pass2-names.js'
import { pass3 } from './pass3-facts.js'
import { pass4 } from './pass4-dates.js'
import { checkTools, cleanTmp, initTmp, shell } from './shell.js'
import { log } from './util.js'

async function report() {
  await shell(
    `duckdb -bail -c "SELECT 'facts' AS file, count(*) AS rows FROM '${FACTS_PARQUET}' ` +
    `UNION ALL SELECT 'dates', count(*) FROM '${DATES_PARQUET}'"`
  )
}

async function main() {
  const step = process.argv[2]
  checkTools()
  await mkdir(DATA, { recursive: true })
  await initTmp()
  try {
    if (!step) {
      await pass1()
      const names = await pass2()
      await pass3(names)
      await pass4(names)
      await rm(NAMES_FILE, { force: true }) // intermediate only — parquet files are the output
      log(`removed ${NAMES_FILE}`)
      await report()
      log('all done')
    } else if (step === '1') {
      await pass1()
    } else if (step === '2') {
      await pass2()
    } else if (step === '3') {
      await pass3(await loadNames())
    } else if (step === '4') {
      await pass4(await loadNames())
    } else {
      throw new Error(`unknown step '${step}' — use 1, 2, 3, 4 or no argument for all`)
    }
  } finally {
    await cleanTmp()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
