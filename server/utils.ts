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