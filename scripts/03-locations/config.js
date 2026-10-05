import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const location = '/Volumes/4TB/data/freebase/'
const FILTERED = process.env.FLOORBASE_FILTERED || resolve(location, 'freebase-filtered.gz')
const DATA = process.env.FLOORBASE_DATA || fileURLToPath(new URL('../../data/', import.meta.url))
const OUTPUT = resolve(DATA, 'locations.parquet')

// Exact predicates observed in samples/top-properties.txt; rebuild the cache after additions.
const PROPERTIES = [
  'type.object.name',
  'type.object.type',
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

// Require explicit membership in this type and a nonempty @en name.
const ENTITY_TYPE = 'location.location'
// One-hop compound expansion; all selected values remain in data as arrays.
const COMPOUNDS = {
  'location.location.adjoin_s': ['location.adjoining_relationship.adjoins'],
  'location.location.geolocation': ['location.geocode.latitude', 'location.geocode.longitude', 'location.geocode.elevation', 'location.geocode.datum'],
  'location.statistical_region.population': ['measurement_unit.dated_integer.number', 'measurement_unit.dated_integer.year'],
}
const COLUMNS = {
  latitude: { path: ['location.location.geolocation', 'location.geocode.latitude'], numeric: true },
  longitude: { path: ['location.location.geolocation', 'location.geocode.longitude'], numeric: true },
  area: { path: ['location.location.area'], numeric: true },
  country_code: { path: ['location.country.iso3166_1_alpha2'] },
  capital_id: { path: ['location.country.capital'] },
  containedby_ids: { path: ['location.location.containedby'], multiple: true },
}

// Full dump on a 4–8 core laptop, 16 GB RAM, SSD; unbenchmarked minutes.
const MINUTES = [45, 180]
const MEMORY_LIMIT = '4GB'
const THREADS = 4
const ROW_GROUP_SIZE = 122880
const ENGLISH_ONLY = true
// null shows every whitelisted property, including zero counts.
const REPORT_TOP_K = null

export { ENTITY_TYPE, COMPOUNDS, COLUMNS, FILTERED, DATA, OUTPUT, PROPERTIES, MINUTES, MEMORY_LIMIT, THREADS, ROW_GROUP_SIZE, ENGLISH_ONLY, REPORT_TOP_K }
