import { FILTERED, DATA, TEMP_DIRECTORY, MAX_TEMP_DIRECTORY_SIZE, EVENTS_PARQUET as OUTPUT } from '../../config.js'

// Exact predicates observed in samples/top-properties.txt; rebuild the cache after additions.
// Date-valued properties only: object also becomes the date column.
const PROPERTIES = [
  // Life events and founding dates.
  'people.person.date_of_birth',
  'people.deceased_person.date_of_death',
  'organization.organization.date_founded',
  'location.dated_location.date_founded',
  'location.dated_location.date_dissolved',
  // Scheduled and recurring events (Freebase spells these "occurance").
  'time.event.start_date',
  'time.event.end_date',
  'time.recurring_event.date_of_first_occurance',
  'time.recurring_event.date_of_final_occurance',
  // Publications, releases and broadcasts; omit CVT links such as release_date_s.
  'book.written_work.date_of_first_publication',
  'book.book_edition.publication_date',
  'book.periodical.first_issue_date',
  'book.periodical.final_issue_date',
  'film.film.initial_release_date',
  'music.album.release_date',
  'music.release.release_date',
  'tv.tv_program.air_date_of_first_episode',
  'tv.tv_program.air_date_of_final_episode',
  'tv.tv_series_episode.air_date',
  'cvg.computer_videogame.release_date',
  // Cultural, scientific and construction milestones.
  'visual_art.artwork.date_begun',
  'visual_art.artwork.date_completed',
  'theater.play.date_of_first_performance',
  'astronomy.astronomical_discovery.discovery_date',
  'spaceflight.satellite.launch_date',
  'architecture.structure.construction_started',
  'architecture.structure.opened',
  'architecture.structure.destruction_date',
]

// Full dump on a 4–8 core laptop, 16 GB RAM, SSD; unbenchmarked minutes.
const MINUTES = [20, 90]
const MEMORY_LIMIT = '4GB'
const THREADS = 4
const ROW_GROUP_SIZE = 122880
const ENGLISH_ONLY = true
// null shows every whitelisted property, including zero counts.
const REPORT_TOP_K = null

export { TEMP_DIRECTORY, MAX_TEMP_DIRECTORY_SIZE, FILTERED, DATA, OUTPUT, PROPERTIES, MINUTES, MEMORY_LIMIT, THREADS, ROW_GROUP_SIZE, ENGLISH_ONLY, REPORT_TOP_K }
