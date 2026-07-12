// paths + constants shared by every pass.
// paths can be overridden with env vars: FLOORBASE_DUMP, FLOORBASE_FILTERED, FLOORBASE_DATA
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export const ROOT = import.meta.dirname
export const DUMP = process.env.FLOORBASE_DUMP || resolve(homedir(), 'Desktop/freebase-rdf-latest.gz')
export const FILTERED = process.env.FLOORBASE_FILTERED || resolve(homedir(), 'Desktop/freebase-filtered.gz')
export const DATA = process.env.FLOORBASE_DATA || join(ROOT, 'data')
export const NAMES_FILE = join(DATA, 'wikipedia-names.json')
export const FACTS_PARQUET = join(DATA, 'facts.parquet')
export const DATES_PARQUET = join(DATA, 'dates.parquet')

export const EXCLUDE_FILE = join(ROOT, './src/exclude.txt')
export const INCLUDE_FILE = join(ROOT, './src/include.txt')
export const DATES_FILE = join(ROOT, './src/dates.txt')

export const NS = '<http://rdf.freebase.com/ns/'
export const WIKI_PRED = '<http://rdf.freebase.com/key/wikipedia.en_title>'

// language-tagged literals (descriptions etc) come in ~100 languages — keep only @en.
// untagged and typed literals (dates, numbers, keys) are always kept.
export const ENGLISH_ONLY = true
