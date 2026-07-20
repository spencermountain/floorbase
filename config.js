// paths + constants shared by every pass.
// paths can be overridden with env vars: FLOORBASE_DUMP, FLOORBASE_FILTERED, FLOORBASE_DATA
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export const ROOT = import.meta.dirname
export const DUMP = process.env.FLOORBASE_DUMP || resolve(homedir(), 'Desktop/freebase-rdf-latest.gz')
export const FILTERED = process.env.FLOORBASE_FILTERED || resolve(homedir(), 'Desktop/freebase-filtered.gz')
export const DATA = process.env.FLOORBASE_DATA || join(ROOT, 'data')
export const NAMES_FILE = join(DATA, 'wikipedia-names.json')
export const PEOPLE_PARQUET = join(DATA, 'people.parquet')
export const LOCATIONS_PARQUET = join(DATA, 'locations.parquet')
export const EVENTS_PARQUET = join(DATA, 'events.parquet')
// pass 5 writes events unsorted (cheap streaming); pass 6 sorts them into EVENTS_PARQUET
export const EVENTS_UNSORTED = join(DATA, 'events-unsorted.parquet')

export const EXCLUDE_FILE = join(ROOT, './src/exclude.txt')
export const PEOPLE_FILE = join(ROOT, './src/people.txt')
export const LOCATIONS_FILE = join(ROOT, './src/locations.txt')
export const DATES_FILE = join(ROOT, './src/dates.txt')

export const NS = '<http://rdf.freebase.com/ns/'
export const WIKI_PRED = '<http://rdf.freebase.com/key/wikipedia.en_title>'

// language-tagged literals (descriptions etc) come in ~100 languages — keep only @en.
// untagged and typed literals (dates, numbers, keys) are always kept.
export const ENGLISH_ONLY = true

// hard cap on a single object value. bounds csv row size so duckdb's pipe reader
// stays memory-safe — real descriptions are a few kb, so this only trims junk
export const MAX_OBJ_CHARS = 65536
