import prepare from './index.js'
import { log } from './_lib/log.js'

await prepare().catch((error) => {
  log(error.message, { last: true, tone: 'red' })
  process.exitCode = 1
})
