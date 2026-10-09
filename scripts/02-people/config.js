import { FILTERED, DATA, TEMP_DIRECTORY, MAX_TEMP_DIRECTORY_SIZE, PEOPLE_PARQUET as OUTPUT } from '../../config.js'

// Exact predicates observed in samples/top-properties.txt; rebuild the cache after additions.
const PROPERTIES = [
  'type.object.name',
  'type.object.type',
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

// Require explicit membership in this type and a nonempty @en name.
const ENTITY_TYPE = 'people.person'
// One-hop compound expansion; all selected values remain in data as arrays.
const COMPOUNDS = {
  'people.person.sibling_s': ['people.sibling_relationship.sibling'],
  'people.person.spouse_s': ['people.marriage.spouse', 'people.marriage.from', 'people.marriage.to', 'people.marriage.type_of_union'],
  'people.person.education': ['education.education.institution', 'education.education.degree', 'education.education.major_field_of_study', 'education.education.start_date', 'education.education.end_date'],
  'people.person.employment_history': ['business.employment_tenure.company', 'business.employment_tenure.title', 'business.employment_tenure.from', 'business.employment_tenure.to'],
  'people.person.places_lived': ['people.place_lived.location', 'people.place_lived.start_date', 'people.place_lived.end_date'],
}
const COLUMNS = {
  birth_date: { path: ['people.person.date_of_birth'] },
  death_date: { path: ['people.deceased_person.date_of_death'] },
  gender_id: { path: ['people.person.gender'] },
  birthplace_id: { path: ['people.person.place_of_birth'] },
  nationality_ids: { path: ['people.person.nationality'], multiple: true },
  profession_ids: { path: ['people.person.profession'], multiple: true },
}

// Full dump on a 4–8 core laptop, 16 GB RAM, SSD; unbenchmarked minutes.
const MINUTES = [60, 240]
const MEMORY_LIMIT = process.env.FLOORBASE_PEOPLE_MEMORY || '4GB'
// Bound list/JSON aggregation to a small fraction of people at a time.
const BATCH_COUNT = Number(process.env.FLOORBASE_PEOPLE_BATCHES || 256)
const THREADS = 2
const ROW_GROUP_SIZE = 122880
const ENGLISH_ONLY = true
// null shows every whitelisted property, including zero counts.
const REPORT_TOP_K = null

export { BATCH_COUNT, TEMP_DIRECTORY, MAX_TEMP_DIRECTORY_SIZE, ENTITY_TYPE, COMPOUNDS, COLUMNS, FILTERED, DATA, OUTPUT, PROPERTIES, MINUTES, MEMORY_LIMIT, THREADS, ROW_GROUP_SIZE, ENGLISH_ONLY, REPORT_TOP_K }
