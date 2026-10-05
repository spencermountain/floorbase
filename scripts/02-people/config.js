import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const location = '/Volumes/4TB/data/freebase/'
const FILTERED = process.env.FLOORBASE_FILTERED || resolve(location, 'freebase-filtered.gz')
const DATA = process.env.FLOORBASE_DATA || fileURLToPath(new URL('../../data/', import.meta.url))
const OUTPUT = resolve(DATA, 'people.parquet')

// Exact predicates observed in samples/top-properties.txt; rebuild the cache after additions.
const PROPERTIES = [
  // Core biography.
  'people.person.date_of_birth',
  'people.person.place_of_birth',
  'people.person.gender',
  'people.person.nationality',
  'people.person.profession',
  'people.person.languages',
  'people.deceased_person.date_of_death',
  'people.deceased_person.place_of_death',
  'people.deceased_person.cause_of_death',
  'people.deceased_person.place_of_burial',
  // Family: retain both entry links and compound-value node (CVT) fields.
  'people.person.parents',
  'people.person.children',
  'people.person.sibling_s',
  'people.sibling_relationship.sibling',
  'people.person.spouse_s',
  'people.marriage.spouse',
  'people.marriage.from',
  'people.marriage.to',
  'people.marriage.type_of_union',
  // Education.
  'people.person.education',
  'education.education.institution',
  'education.education.degree',
  'education.education.major_field_of_study',
  'education.education.start_date',
  'education.education.end_date',
  // Employment.
  'people.person.employment_history',
  'business.employment_tenure.company',
  'business.employment_tenure.title',
  'business.employment_tenure.from',
  'business.employment_tenure.to',
  // Residences.
  'people.person.places_lived',
  'people.place_lived.location',
  'people.place_lived.start_date',
  'people.place_lived.end_date',
]

// Full dump on a 4–8 core laptop, 16 GB RAM, SSD; unbenchmarked minutes.
const MINUTES = [30, 120]
const MEMORY_LIMIT = '4GB'
const THREADS = 4
const ROW_GROUP_SIZE = 122880
const ENGLISH_ONLY = true
// null shows every whitelisted property, including zero counts.
const REPORT_TOP_K = null

export { FILTERED, DATA, OUTPUT, PROPERTIES, MINUTES, MEMORY_LIMIT, THREADS, ROW_GROUP_SIZE, ENGLISH_ONLY, REPORT_TOP_K }
