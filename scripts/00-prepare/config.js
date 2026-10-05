import { PROPERTIES as events } from '../01-events/config.js'
import { PROPERTIES as people } from '../02-people/config.js'
import { PROPERTIES as locations } from '../03-locations/config.js'
import { PROPERTIES as wikipedia } from '../04-wikipedia/config.js'
import { resolve } from 'node:path'

const location = '/Volumes/4TB/data/freebase/'
const FILTERED = process.env.FLOORBASE_FILTERED || resolve(location, 'freebase-filtered.gz')
const DUMP = process.env.FLOORBASE_DUMP || resolve(location, 'freebase-rdf-latest.gz')

// Preparation retains the union so every independent build can reuse its cache.
const PROPERTIES = [...new Set([...events, ...people, ...locations, ...wikipedia])]
const PREPARE_MINUTES = [60, 240]

export { DUMP, FILTERED, PROPERTIES, PREPARE_MINUTES }
