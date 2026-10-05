import { OUTPUT, PROPERTIES, COMPOUNDS, REPORT_TOP_K } from '../config.js'
import { duckdb, sqlString } from './process.js'
import { log } from './log.js'

const report = async (temp) => {
  const file = sqlString(OUTPUT)
  const metrics = PROPERTIES.map((property, index) => {
    const paths = [`json_extract(data, ${sqlString(`$.${JSON.stringify(property)}`)}) IS NOT NULL`]
    Object.entries(COMPOUNDS).forEach(([parent, children]) => {
      if (children.includes(property)) {
        const path = `$.${JSON.stringify(parent)}[*].data.${JSON.stringify(property)}`
        paths.push(`len(json_extract(data, ${sqlString(path)})) > 0`)
      }
    })
    return `count(*) FILTER (WHERE ${paths.join(' OR ')}) AS p${index}`
  })
  const counts = PROPERTIES.map((property, index) =>
    `SELECT ${sqlString(property)} AS predicate, p${index} AS rows, total_rows FROM metrics`).join(' UNION ALL ')
  let limit = PROPERTIES.length
  if (REPORT_TOP_K !== null) {
    if (!Number.isInteger(REPORT_TOP_K) || REPORT_TOP_K < 1) {
      throw new Error('REPORT_TOP_K must be null or a positive integer')
    }
    limit = REPORT_TOP_K
  }
  const output = await duckdb(`WITH metrics AS (
    SELECT count(*) AS total_rows, ${metrics.join(', ')} FROM ${file}
  ), counts AS (${counts})
  SELECT * FROM counts ORDER BY rows DESC, predicate LIMIT ${limit};`, temp, true)
  const rows = JSON.parse(output)
  const total = rows[0]?.total_rows || 0
  log(`Property counts · ${total.toLocaleString('en-US')} named entities`, { tone: 'cyan' })
  const width = Math.max(...rows.map((row) => row.rows.toLocaleString('en-US').length))
  rows.forEach((row, index) => {
    const count = row.rows.toLocaleString('en-US').padStart(width)
    log(`${count}  ${row.predicate}`, { depth: 1, last: index === rows.length - 1 })
  })
}

export default report
