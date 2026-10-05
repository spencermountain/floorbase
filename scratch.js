import floorbase from './src/index.js'
import { DATA } from './config.js'

const db = floorbase(DATA)

console.log(
  'events',
  await db
    .events()
    .where('predicate', 'people.person.date_of_birth')
    .where('date', (date) => date.startsWith('1986-03'))
    .limit(10)
    .all()
)

console.log('people', await db.people()
  .where('birth_date', (date) => date?.startsWith('1986'))
  .select('id', 'name', 'birth_date', 'profession_ids', 'data').limit(10).all()
)

// console.log('locations', await db.locations()
//   .where('latitude', (latitude) => latitude !== null && latitude > 40)
//   .select('id', 'name', 'latitude', 'longitude', 'data').limit(10).all())
//
// console.log('wikipedia', await db.wikipedia()
//   .where('type', 'people.person')
//   .select('page_id', 'type').limit(10).all())
