import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const location = '/Volumes/4TB/data/freebase/'
const FILTERED = process.env.FLOORBASE_FILTERED || resolve(location, 'freebase-filtered.gz')
const DATA = process.env.FLOORBASE_DATA || fileURLToPath(new URL('../../data/', import.meta.url))
const OUTPUT = resolve(DATA, 'wikipedia.parquet')

// Exact predicates observed in samples/top-properties.txt; rebuild the cache after additions.
const PROPERTIES = ['key/wikipedia.en_id', 'type.object.type']

// Full dump on a 4–8 core laptop, 16 GB RAM, SSD; unbenchmarked minutes.
const MINUTES = [30, 120]
const MEMORY_LIMIT = '4GB'
const THREADS = 4
const ROW_GROUP_SIZE = 122880
const ENGLISH_ONLY = true
// null shows every whitelisted property, including zero counts.
const REPORT_TOP_K = null

export { FILTERED, DATA, OUTPUT, PROPERTIES, MINUTES, MEMORY_LIMIT, THREADS, ROW_GROUP_SIZE, ENGLISH_ONLY, REPORT_TOP_K }
