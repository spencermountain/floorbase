import floorbase from './src/index.js'
import { DATA } from './config.js'

const db = floorbase(DATA)

// console.log('events', await db.events()
//   .where('predicate', 'people.person.date_of_birth')
//   .where('date', (date) => date.startsWith('1986-03'))
//   .select('subject', 'date').limit(10).all())

console.log('people', await db.people()
  .where('predicate', 'people.person.profession')
  .select('subject', 'object').limit(10).all())

// console.log('locations', await db.locations()
//   .where('predicate', 'location.country.capital')
//   .select('subject', 'object').limit(10).all())
//
// console.log('wikipedia', await db.wikipedia()
//   .where('type', 'people.person')
//   .select('page_id', 'type').limit(10).all())
