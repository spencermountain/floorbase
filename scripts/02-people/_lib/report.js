import { OUTPUT, PROPERTIES, COMPOUNDS, REPORT_TOP_K } from '../config.js'
import { duckdb, sqlString } from './process.js'
import { log } from './log.js'

// Limit simultaneous JSON extraction vectors during the final report.
const batchSize = 4

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
  let limit = PROPERTIES.length
  if (REPORT_TOP_K !== null) {
    if (!Number.isInteger(REPORT_TOP_K) || REPORT_TOP_K < 1) {
      throw new Error('REPORT_TOP_K must be null or a positive integer')
    }
    limit = REPORT_TOP_K
  }
  const results = []
  for (let start = 0; start < PROPERTIES.length; start += batchSize) {
    const properties = PROPERTIES.slice(start, start + batchSize)
    const counts = properties.map((property, index) =>
      `SELECT ${sqlString(property)} AS predicate, p${start + index} AS rows, total_rows FROM metrics`).join(' UNION ALL ')
    const output = await duckdb(`WITH metrics AS (
      SELECT count(*) AS total_rows, ${metrics.slice(start, start + batchSize).join(', ')} FROM ${file}
    ) ${counts};`, temp, true)
    results.push(...JSON.parse(output))
  }
  const rows = results.sort((a, b) => b.rows - a.rows || a.predicate.localeCompare(b.predicate)).slice(0, limit)
  const total = rows[0]?.total_rows || 0
  log(`Property counts · ${total.toLocaleString('en-US')} named entities`, { tone: 'cyan' })
  const width = Math.max(...rows.map((row) => row.rows.toLocaleString('en-US').length))
  rows.forEach((row, index) => {
    const count = row.rows.toLocaleString('en-US').padStart(width)
    log(`${count}  ${row.predicate}`, { depth: 1, last: index === rows.length - 1 })
  })
}

export default report
