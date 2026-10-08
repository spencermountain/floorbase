import { FILTERED, DATA, TEMP_DIRECTORY, MAX_TEMP_DIRECTORY_SIZE, WIKIPEDIA_PARQUET as OUTPUT } from '../../config.js'

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

export { TEMP_DIRECTORY, MAX_TEMP_DIRECTORY_SIZE, FILTERED, DATA, OUTPUT, PROPERTIES, MINUTES, MEMORY_LIMIT, THREADS, ROW_GROUP_SIZE, ENGLISH_ONLY, REPORT_TOP_K }
