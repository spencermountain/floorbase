import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const location = '/Volumes/4TB/data/freebase/'
const FILTERED = process.env.FLOORBASE_FILTERED || resolve(location, 'freebase-filtered.gz')
const DATA = process.env.FLOORBASE_DATA || fileURLToPath(new URL('../../data/', import.meta.url))
const OUTPUT = resolve(DATA, 'locations.parquet')

// Exact predicates observed in samples/top-properties.txt; rebuild the cache after additions.
const PROPERTIES = [
  // Containment, borders and physical extent.
  'location.location.containedby',
  'location.location.contains',
  'location.location.adjoin_s',
  'location.adjoining_relationship.adjoins',
  'location.location.area',
  'location.location.mean_elevation',
  'location.location.time_zones',
  // Coordinates: geolocation points to a CVT, not a literal pair.
  'location.location.geolocation',
  'location.geocode.latitude',
  'location.geocode.longitude',
  'location.geocode.elevation',
  'location.geocode.datum',
  // Population observations: number/year are shared CVT properties.
  'location.statistical_region.population',
  'measurement_unit.dated_integer.number',
  'measurement_unit.dated_integer.year',
  // Country metadata and standard identifiers.
  'location.country.capital',
  'location.country.administrative_divisions',
  'location.country.iso3166_1_alpha2',
  'location.country.iso_alpha_3',
  'location.country.iso_numeric',
  'location.country.official_language',
  'location.country.currency_used',
  'location.country.calling_code',
  'location.location.gnis_feature_id',
  // Major physical geography.
  'geography.mountain.elevation',
  'geography.mountain.mountain_range',
  'geography.river.length',
  'geography.river.origin',
  'geography.river.mouth',
  'geography.river.basin_countries',
  'geography.lake.surface_elevation',
  'geography.lake.basin_countries',
]

// Full dump on a 4–8 core laptop, 16 GB RAM, SSD; unbenchmarked minutes.
const MINUTES = [20, 90]
const MEMORY_LIMIT = '4GB'
const THREADS = 4
const ROW_GROUP_SIZE = 122880
const ENGLISH_ONLY = true
// null shows every whitelisted property, including zero counts.
const REPORT_TOP_K = null

export { FILTERED, DATA, OUTPUT, PROPERTIES, MINUTES, MEMORY_LIMIT, THREADS, ROW_GROUP_SIZE, ENGLISH_ONLY, REPORT_TOP_K }
