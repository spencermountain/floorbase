// floorbase — freebase rdf dump → filtered gzip → wikipedia names → three parquet files
//
// usage:
//   node src/index.js        run the full pipeline (~1hr on the 32gb dump)
//   node src/index.js 1      exclude pass only     (dump.gz → filtered.gz)
//   node src/index.js 2      wikipedia names only   (filtered.gz → data/wikipedia-names.json)
//   node src/index.js 3      people parquet         (needs steps 1 + 2, props from src/people.txt)
//   node src/index.js 4      locations parquet      (needs steps 1 + 2, props from src/locations.txt)
//   node src/index.js 5      events parquet, unsorted (needs steps 1 + 2, props from src/dates.txt)
//   node src/index.js 6      sort events parquet    (needs step 5)
//
// the full run deletes data/wikipedia-names.json when finished; single-step runs keep it.
// only step 1 needs the raw dump — after that it can be moved off-disk.
// paths can be overridden with env vars — see config.js

import { mkdir, rm } from 'node:fs/promises'
import {
  DATA, EVENTS_PARQUET, LOCATIONS_FILE, LOCATIONS_PARQUET,
  NAMES_FILE, PEOPLE_FILE, PEOPLE_PARQUET,
} from '../config.js'
import { domainPass } from './domain-pass.js'
import { eventsPass } from './events-pass.js'
import { pass1 } from './pass1-exclude.js'
import { loadNames, pass2 } from './pass2-names.js'
import { checkTools, cleanTmp, initTmp, shell } from './shell.js'
import { sortPass } from './sort-pass.js'
import { log } from './util.js'

const peoplePass = (names) =>
  domainPass({ label: 'people', prefixFile: PEOPLE_FILE, output: PEOPLE_PARQUET, names })
const locationsPass = (names) =>
  domainPass({ label: 'locations', prefixFile: LOCATIONS_FILE, output: LOCATIONS_PARQUET, names })

async function report() {
  await shell(
    `duckdb -bail -c "SELECT 'people' AS file, count(*) AS rows FROM '${PEOPLE_PARQUET}' ` +
    `UNION ALL SELECT 'locations', count(*) FROM '${LOCATIONS_PARQUET}' ` +
    `UNION ALL SELECT 'events', count(*) FROM '${EVENTS_PARQUET}'"`
  )
}

async function main() {
  const step = process.argv[2]
  checkTools({ needDump: !step || step === '1' })
  await mkdir(DATA, { recursive: true })
  await initTmp()
  try {
    if (!step) {
      await pass1()
      let names = await pass2()
      await peoplePass(names)
      await locationsPass(names)
      await eventsPass(names)
      names = null // let the ~1gb map go before the sort competes for memory
      await sortPass()
      await rm(NAMES_FILE, { force: true }) // intermediate only — parquet files are the output
      log(`removed ${NAMES_FILE}`)
      await report()
      log('all done')
    } else if (step === '1') {
      await pass1()
    } else if (step === '2') {
      await pass2()
    } else if (step === '3') {
      await peoplePass(await loadNames())
    } else if (step === '4') {
      await locationsPass(await loadNames())
    } else if (step === '5') {
      await eventsPass(await loadNames())
    } else if (step === '6') {
      await sortPass()
    } else {
      throw new Error(`unknown step '${step}' — use 1-6 or no argument for all`)
    }
  } finally {
    await cleanTmp()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
