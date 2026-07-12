// process + stream plumbing: shell pipelines, line iteration, duckdb, tmp files
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DUMP } from '../config.js'

// session tmp dir, holds rg pattern files + throwaway duckdb databases
let TMP = null

export async function initTmp() {
  TMP = await mkdtemp(join(tmpdir(), 'floorbase-'))
}

export async function cleanTmp() {
  if (TMP) await rm(TMP, { recursive: true, force: true })
}

export const writePatterns = async (name, pats) => {
  const file = join(TMP, `${name}.pats`)
  await writeFile(file, pats.join('\n') + '\n')
  return file
}

// single-quote a string for the shell
export const q = (s) => `'${String(s).replaceAll(`'`, `'\\''`)}'`

// run a shell pipeline to completion (stdout inherited)
export const shell = (cmd) =>
  new Promise((res, rej) => {
    const c = spawn('bash', ['-c', 'set -o pipefail\n' + cmd], { stdio: ['ignore', 'inherit', 'inherit'] })
    c.on('error', rej)
    c.on('close', (code) => (code === 0 ? res() : rej(new Error(`command failed (exit ${code}): ${cmd}`))))
  })

// run a shell pipeline, streaming its stdout back to us
export const streamCmd = (cmd) => {
  const c = spawn('bash', ['-c', 'set -o pipefail\n' + cmd], { stdio: ['ignore', 'pipe', 'inherit'] })
  const done = new Promise((res, rej) => {
    c.on('error', rej)
    c.on('close', (code) => (code === 0 ? res() : rej(new Error(`command failed (exit ${code}): ${cmd}`))))
  })
  return { stdout: c.stdout, done }
}

// iterate lines of a stream without readline overhead. fn may return a promise for backpressure.
export async function eachLine(stream, fn) {
  stream.setEncoding('utf8')
  let rem = ''
  for await (const chunk of stream) {
    const data = rem + chunk
    let start = 0
    let i
    while ((i = data.indexOf('\n', start)) !== -1) {
      const p = fn(data.slice(start, i))
      if (p) await p
      start = i + 1
    }
    rem = data.slice(start)
  }
  if (rem) {
    const p = fn(rem)
    if (p) await p
  }
}

// batches small writes into ~1mb chunks, honouring backpressure
export class BufWriter {
  constructor(stream, size = 1 << 20) {
    this.stream = stream
    this.size = size
    this.parts = []
    this.len = 0
    this.err = null
    stream.on('error', (e) => (this.err = e))
  }
  write(s) {
    this.parts.push(s)
    this.len += s.length
    return this.len >= this.size ? this.flush() : null
  }
  async flush() {
    if (this.err) throw this.err
    if (this.len === 0) return
    const chunk = this.parts.join('')
    this.parts = []
    this.len = 0
    if (!this.stream.write(chunk)) await once(this.stream, 'drain')
  }
  async end() {
    await this.flush()
    this.stream.end()
  }
}

// spawn duckdb writing a parquet file from csv on stdin; returns { stdin-writer, done }
// the `cat |` hop matters: node gives children a socketpair as stdin, which macOS
// can't reopen as '/dev/stdin' — cat turns it into a real kernel pipe duckdb can read.
// -bail matters too: without it the duckdb cli exits 0 even when the query errors.
export function duckdbCopy(sql) {
  const db = join(TMP, `tmp-${Math.random().toString(36).slice(2)}.db`)
  const c = spawn('bash', ['-c', 'set -o pipefail\ncat | duckdb -bail "$1" -c "$2"', 'bash', db, sql], {
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  c.stdin.on('error', () => { }) // EPIPE surfaces via exit code instead
  const done = new Promise((res, rej) => {
    c.on('error', rej)
    c.on('close', (code) => (code === 0 ? res() : rej(new Error(`duckdb failed (exit ${code})`))))
  })
  return { bw: new BufWriter(c.stdin), done }
}

export const hasPigz = () => spawnSync('which', ['pigz']).status === 0

export function checkTools() {
  for (const [tool, hint] of [['rg', 'brew install ripgrep'], ['duckdb', 'brew install duckdb'], ['gzcat', '']]) {
    if (spawnSync('which', [tool]).status !== 0) {
      throw new Error(`missing required tool '${tool}'${hint ? ` — ${hint}` : ''}`)
    }
  }
  if (!existsSync(DUMP)) throw new Error(`dump not found: ${DUMP}`)
}
