// Respect redirected output, NO_COLOR and explicit FORCE_COLOR overrides.
const enabled = !('NO_COLOR' in process.env) && process.env.FORCE_COLOR !== '0'
  && (Boolean(process.stderr.isTTY) || Boolean(process.env.FORCE_COLOR))
const colors = { cyan: 36, green: 32, yellow: 33, red: 31, dim: 90 }
const paint = (text, tone) => {
  if (!enabled) {
    return text
  }
  return `\x1b[${colors[tone] || 36}m${text}\x1b[0m`
}
const heading = (title) => console.error(`\n${paint(`  ╭─ ${title}`, 'cyan')}`)
const log = (message, { depth = 0, last = false, tone = 'dim' } = {}) => {
  const branch = last ? '╰─' : '├─'
  String(message).split(/\r?\n/).forEach((line) => {
    console.error(`${paint(`  ${'│  '.repeat(depth)}${branch}`, tone)} ${line}`)
  })
}
const estimate = (minutes, depth = 0) => {
  log(`Estimate: ${minutes.join('–')} min · 4–8 cores / 16 GB / SSD (unbenchmarked)`, { depth })
}
const complete = (message, depth = 0) => log(message, { depth, last: true, tone: 'green' })

export { heading, log, estimate, complete }
