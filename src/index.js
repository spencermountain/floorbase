import Query from './_lib.js'

// Pass a directory/HTTP base URL, or a map of paths, URLs or AsyncBuffers.
const floorbase = (source = './data') => {
  const names = ['events', 'people', 'locations', 'wikipedia']
  return Object.fromEntries(names.map((name) => {
    let file = source[name]
    if (typeof source === 'string') {
      file = `${source.replace(/[\\/]$/, '')}/${name}.parquet`
    }
    return [name, () => {
      if (!file) {
        throw new Error(`Missing source for ${name}`)
      }
      return new Query(file)
    }]
  }))
}

export default floorbase
