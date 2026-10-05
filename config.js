// Compatibility paths for scratch.js and the existing diagnostic scripts.
export { DUMP, FILTERED } from './scripts/00-prepare/config.js'
export { DATA, OUTPUT as EVENTS_PARQUET } from './scripts/01-events/config.js'
export { OUTPUT as PEOPLE_PARQUET } from './scripts/02-people/config.js'
export { OUTPUT as LOCATIONS_PARQUET } from './scripts/03-locations/config.js'
export { OUTPUT as WIKIPEDIA_PARQUET } from './scripts/04-wikipedia/config.js'
