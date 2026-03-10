import type { JobConnector, ScrapedJob } from "./types"

const logTypes = {
  error: "Error",
  success: "Ok",
  info: "Info"
} as const

type LogKey = keyof typeof logTypes

const colors: Record<LogKey | "reset", string> = {
  error: "\x1b[31m",   // Red
  info: "\x1b[34m",    // Blue
  success: "\x1b[32m", // Green
  reset: "\x1b[0m",    // Clear formatting
}

/**
 * @param {LogKey} key
 * @param {string} message
 */
export function log(key: LogKey, message: string) {
  const color = colors[key]
  const label = logTypes[key]
  console.log(`${color}[${label}]${colors.reset} ${message}`)
}

/**
 * @param {Record<string, any>} job
 * @param {JobConnector['selector']['card']} cardSelectors
 * @returns {boolean}
 */
export function isValidJob(
    job: Record<string, any>,
    cardSelectors: JobConnector['selector']['card']
): job is ScrapedJob {
    const requiredKeys: (keyof typeof cardSelectors)[] = ['jobTitle', 'company', 'desc']
    for (const key of requiredKeys) {
        const val = job[key]
        if (val === null || val === undefined) return false
        if (typeof val === 'string' && val.trim() === '') return false
        if (Array.isArray(val) && val.length === 0) return false
    }
    const optionalKeys: (keyof typeof cardSelectors)[] = ['logo', 'jobTags', 'techTags']
    for (const key of optionalKeys) {
        if (cardSelectors[key] !== null && job[key] === null) return false
    }
    return true
}

/**
 * @param {JobConnector['selector']['card']} cardSelectors
 * @returns {object}
 */
export function stripProcessors(cardSelectors: JobConnector['selector']['card']) {
    return Object.fromEntries(
        Object.entries(cardSelectors).map(([key, val]) => [
            key,
            val ? { ...val, processor: undefined } : val
        ])
    )
}

/**
 * @param {Record<string, any>} raw
 * @param {JobConnector['selector']['card']} cardSelectors
 * @returns {Record<string, any>}
 */
export function applyProcessors(
    raw: Record<string, any>,
    cardSelectors: JobConnector['selector']['card']
): Record<string, any> {
    for (const [key, val] of Object.entries(cardSelectors)) {
        if (val?.processor && raw[key] != null) raw[key] = val.processor(raw[key])
    }
    return raw
}

/**
 * @param {Record<string, any>} raw
 * @returns {object}
 */
export function remapKeys(raw: Record<string, any>): Record<string, any> {
    const { _from, ...rest } = raw
    return { connector_id: _from, ...rest }
}

/**
 * @param {Record<string, any>} raw
 */
export function logCard(raw: Record<string, any>) {
    const TRIM = 100
    const lines = Object.entries(raw)
        .filter(([key]) => key !== 'connector_id')
        .map(([key, val]) => {
            if (val === null || val === undefined) return `     ${key}: -`
            const str     = Array.isArray(val) ? val.join(', ') : String(val)
            const trimmed = str.length > TRIM ? str.slice(0, TRIM) + '…' : str
            return `     ${key}: ${trimmed}`
        })
    console.log(lines.join('\n'))
}