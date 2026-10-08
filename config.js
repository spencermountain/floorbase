import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Machine-specific defaults live here. Change SOURCE or set FLOORBASE_SOURCE
// to the directory containing your dump; build implementations stay portable.
const SOURCE = process.env.FLOORBASE_SOURCE || '/Volumes/4TB/data/freebase'
const DUMP = process.env.FLOORBASE_DUMP || resolve(SOURCE, 'freebase-rdf-latest.gz')
const FILTERED = process.env.FLOORBASE_FILTERED || resolve(SOURCE, 'freebase-filtered.gz')
const DATA = process.env.FLOORBASE_DATA || fileURLToPath(new URL('./data/', import.meta.url))
// Stage CSVs and spill beside the filtered dump (external HDD by default).
const TEMP_DIRECTORY = process.env.FLOORBASE_TEMP || resolve(dirname(FILTERED), 'tmp')
// Unset keeps DuckDB's free-space-based limit; an override still needs real disk space.
const MAX_TEMP_DIRECTORY_SIZE = process.env.FLOORBASE_MAX_TEMP_SIZE || null

const EVENTS_PARQUET = resolve(DATA, 'events.parquet')
const PEOPLE_PARQUET = resolve(DATA, 'people.parquet')
const LOCATIONS_PARQUET = resolve(DATA, 'locations.parquet')
const WIKIPEDIA_PARQUET = resolve(DATA, 'wikipedia.parquet')

export {
  SOURCE, DUMP, FILTERED, DATA, TEMP_DIRECTORY, MAX_TEMP_DIRECTORY_SIZE,
  EVENTS_PARQUET, PEOPLE_PARQUET, LOCATIONS_PARQUET, WIKIPEDIA_PARQUET,
}
