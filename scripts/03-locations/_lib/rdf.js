import { ENGLISH_ONLY } from '../config.js'

const namespace = '<http://rdf.freebase.com/ns/'
const decode = (value) => value.replace(/\\(u[\da-fA-F]{4}|U[\da-fA-F]{8}|["\\nrt])/g, (_, escape) => {
  if (escape[0] === 'u' || escape[0] === 'U') {
    return String.fromCodePoint(parseInt(escape.slice(1), 16))
  }
  return ({ n: '\n', r: '\r', t: '\t' })[escape] || escape
})
const parse = (line, predicates) => {
  const [subject, predicate, raw] = line.split('\t')
  if (!subject.startsWith(namespace) || !predicates.has(predicate) || !raw) {
    return null
  }
  const value = raw.trim().replace(/\s+\.$/, '')
  const property = predicates.get(predicate)
  if (property === 'type.object.name' && (!value.startsWith('"') || !value.endsWith('"@en'))) {
    return null
  }
  if (property === 'type.object.type' && !value.startsWith(namespace)) {
    return null
  }
  let object
  if (value.startsWith('<')) {
    object = value.slice(1, -1).replace(/^http:\/\/rdf.freebase.com\/ns\//, '')
  } else {
    const end = value.lastIndexOf('"')
    if (!value.startsWith('"') || end < 1) {
      return null
    }
    const suffix = value.slice(end + 1)
    if (ENGLISH_ONLY && suffix.startsWith('@') && suffix !== '@en') {
      return null
    }
    object = decode(value.slice(1, end))
  }
  return [subject.slice(namespace.length, -1), predicates.get(predicate), object]
}
const csv = (values) => values.map((value) => `"${value.replaceAll('"', '""')}"`).join(',') + '\n'

export { parse, csv }
