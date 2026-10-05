import { asyncBufferFromFile, asyncBufferFromUrl, parquetMetadataAsync, parquetReadObjects } from 'hyparquet'

const open = async (source) => {
  if (typeof source !== 'string') {
    return source
  }
  if (/^https?:\/\//.test(source)) {
    return asyncBufferFromUrl({ url: source })
  }
  return asyncBufferFromFile(source)
}

class Query {
  constructor(source, state = {}) {
    this.source = source
    this.state = { filters: [], columns: undefined, limit: Infinity, ...state }
  }
  where(column, value) {
    const filter = { column, value }
    return new Query(this.source, { ...this.state, filters: [...this.state.filters, filter] })
  }
  select(...columns) {
    if (!columns.length) {
      throw new Error('select requires at least one column')
    }
    return new Query(this.source, { ...this.state, columns })
  }
  limit(value) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('limit must be a non-negative safe integer')
    }
    return new Query(this.source, { ...this.state, limit: value })
  }
  async *rows() {
    const { filters, columns, limit } = this.state
    if (limit === 0) {
      return
    }
    const file = await open(this.source)
    const metadata = await parquetMetadataAsync(file)
    let readColumns
    if (columns) {
      readColumns = [...new Set([...columns, ...filters.map((filter) => filter.column)])]
    }
    const available = new Set(metadata.schema.map((field) => field.name))
    const requested = [...(readColumns || []), ...filters.map((filter) => filter.column)]
    requested.forEach((column) => {
      if (!available.has(column)) {
        throw new Error(`Unknown column: ${column}`)
      }
    })
    let offset = 0
    let emitted = 0
    // Decode one row group at a time, so large files do not become one JS array.
    for (const group of metadata.row_groups) {
      const end = offset + Number(group.num_rows)
      const batch = await parquetReadObjects({ file, metadata, columns: readColumns, rowStart: offset, rowEnd: end })
      for (const row of batch) {
        // Entity builds store the flexible payload as JSON text in Parquet.
        if (typeof row.data === 'string') {
          row.data = JSON.parse(row.data)
        }
        const matches = filters.every(({ column, value }) => {
          if (typeof value === 'function') {
            return value(row[column])
          }
          return row[column] === value
        })
        if (!matches) {
          continue
        }
        let result = row
        if (columns) {
          result = Object.fromEntries(columns.map((column) => [column, row[column]]))
        }
        yield result
        emitted++
        if (emitted >= limit) {
          return
        }
      }
      offset = end
    }
  }
  async all() {
    const result = []
    for await (const row of this.rows()) {
      result.push(row)
    }
    return result
  }
  async count() {
    let count = 0
    for await (const row of this.rows()) {
      if (row) {
        count++
      }
    }
    return count
  }
  async top(column, k = 10) {
    if (!Number.isSafeInteger(k) || k < 1) {
      throw new Error('top requires a positive safe integer')
    }
    const counts = new Map()
    for await (const row of this.select(column).rows()) {
      counts.set(row[column], (counts.get(row[column]) || 0) + 1)
    }
    return [...counts].map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value))).slice(0, k)
  }
}

export default Query
