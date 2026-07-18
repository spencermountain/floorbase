// small pure helpers: logging, text cleanup, csv
import { statSync } from 'node:fs'
import { NS } from '../config.js'

const t0 = Date.now()

export const log = (msg) => {
  const mins = ((Date.now() - t0) / 60000).toFixed(1)
  console.error(`[${mins}m] ${msg}`)
}

export const gb = (file) => `${(statSync(file).size / 1e9).toFixed(2)}gb`

// non-empty trimmed lines of a pattern file
export const lines = (txt) => txt.split('\n').map((l) => l.trim()).filter(Boolean)

// n-triples literal escapes: \" \\ \n \t \r \uXXXX \UXXXXXXXX
export function unescapeNT(s) {
  if (!s.includes('\\')) return s
  return s.replace(/\\(u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g, (_, g) => {
    switch (g[0]) {
      case 'u': return String.fromCharCode(parseInt(g.slice(1), 16))
      case 'U': return String.fromCodePoint(parseInt(g.slice(1), 16))
      case 'n': return '\n'
      case 't': return '\t'
      case 'r': return '\r'
      default: return g
    }
  })
}

// freebase keys escape odd chars as $XXXX hex; titles use _ for spaces
export const decodeKey = (s) =>
  s.replace(/\$([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/_/g, ' ')

// encode newlines as \x01 so every csv record stays on one physical line —
// duckdb's streaming readers choke on multi-line quoted fields, so the copy
// restores them afterwards with replace(col, chr(1), chr(10))
export function oneLine(s) {
  if (!s.includes('\n') && !s.includes('\r') && !s.includes('\x01')) return s
  return s.replaceAll('\x01', '').replaceAll('\r\n', '\x01').replaceAll('\n', '\x01').replaceAll('\r', '\x01')
}

// csv field, quoted only when needed. empty string → unquoted empty → NULL in duckdb
export function csv(s) {
  if (s === '') return ''
  if (!/[",\n\r]/.test(s)) return s
  return '"' + s.replaceAll('"', '""') + '"'
}

// strip <http://rdf.freebase.com/ns/...> down to the bare id
export const clip = (s) => {
  if (s.startsWith(NS)) return s.slice(NS.length, -1)
  if (s.charCodeAt(0) === 60 /* < */) return s.slice(1, -1)
  return s
}
