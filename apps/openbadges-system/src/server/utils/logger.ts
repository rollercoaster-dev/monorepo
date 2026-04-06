import fs from 'fs'
import path from 'path'
import {
  Logger,
  QueryLogger,
  ConsoleTransport,
  FileTransport,
  type Transport,
} from '@rollercoaster-dev/rd-logger'

const logToFile = process.env.LOG_TO_FILE === 'true'
const logFilePath = process.env.LOG_FILE_PATH || '.tmp/server.log'
const useJsonFormat = process.env.LOG_FORMAT === 'json'

/**
 * Minimal NDJSON file transport for agent-readable logs.
 * FileTransport hardcodes plain-text format, so we need a separate
 * transport when JSON output is required.
 */
class NdjsonFileTransport implements Transport {
  name = 'ndjson-file'
  private stream: fs.WriteStream | null = null
  private filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  log(level: string, message: string, timestamp: string, context: Record<string, unknown>): void {
    if (!this.stream) {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      this.stream = fs.createWriteStream(this.filePath, { flags: 'a' })
    }
    this.stream.write(JSON.stringify({ level, message, timestamp, ...context }) + '\n')
  }

  cleanup(): void {
    this.stream?.end()
    this.stream = null
  }
}

function buildTransports(): Transport[] | undefined {
  if (!logToFile) return undefined // let Logger use its defaults

  const transports: Transport[] = [new ConsoleTransport()]

  if (useJsonFormat) {
    transports.push(new NdjsonFileTransport(logFilePath))
  } else {
    transports.push(new FileTransport({ filePath: logFilePath }))
  }

  return transports
}

export const logger = new Logger({
  level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  transports: buildTransports(),
})

// QueryLogger for potential future Kysely integration
export const queryLogger = new QueryLogger(logger, {
  slowQueryThreshold: 150,
  logDebugQueries: process.env.NODE_ENV === 'development',
})
