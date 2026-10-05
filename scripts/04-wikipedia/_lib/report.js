import { OUTPUT, PROPERTIES, REPORT_TOP_K } from '../config.js'
import { duckdb, sqlString } from './process.js'
import { log } from './log.js'

const report = async (temp) => {
  const file = sqlString(OUTPUT)
  // Counts are output page/type associations, not raw source triples.
  const counts = `SELECT 'key/wikipedia.en_id' AS predicate, count(page_id) AS rows FROM ${file}
    UNION ALL SELECT 'type.object.type', count(type) FROM ${file}`
  const whitelist = PROPERTIES.map((property) => `(${sqlString(property)})`).join(',')
  let limit = PROPERTIES.length
  if (REPORT_TOP_K !== null) {
    if (!Number.isInteger(REPORT_TOP_K) || REPORT_TOP_K < 1) {
      throw new Error('REPORT_TOP_K must be null or a positive integer')
    }
    limit = REPORT_TOP_K
  }
  const output = await duckdb(`WITH counts AS (${counts})
    SELECT whitelist.predicate, coalesce(counts.rows, 0) AS rows,
      (SELECT count(*) FROM ${file}) AS total_rows
    FROM (VALUES ${whitelist}) AS whitelist(predicate)
    LEFT JOIN counts USING (predicate)
    ORDER BY rows DESC, predicate LIMIT ${limit};`, temp, true)
  const rows = JSON.parse(output)
  const total = rows[0]?.total_rows || 0
  log(`Property counts · ${total.toLocaleString('en-US')} total rows`, { tone: 'cyan' })
  const width = Math.max(...rows.map((row) => row.rows.toLocaleString('en-US').length))
  rows.forEach((row, index) => {
    const count = row.rows.toLocaleString('en-US').padStart(width)
    log(`${count}  ${row.predicate}`, { depth: 1, last: index === rows.length - 1 })
  })
}

export default report
