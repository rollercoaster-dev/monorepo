import fs from 'fs'
import path from 'path'
import {
  Logger,
  QueryLogger,
  ConsoleTransport,
  safeStringify,
  type Transport,
} from '@rollercoaster-dev/rd-logger'

const logToFile = process.env.LOG_TO_FILE === 'true'
const logFilePath = process.env.LOG_FILE_PATH || '.tmp/server.log'

/**
 * Minimal NDJSON file transport for agent-readable logs.
 * FileTransport hardcodes plain-text format, so we need a separate
 * transport when JSON output is required.
 *
 * Fails fast at construction: if `LOG_TO_FILE=true` is set deliberately and
 * we cannot open the file, agents reading `.tmp/server.log` would otherwise
 * see an empty file and conclude "no errors" — exactly the silent failure
 * this transport is meant to make impossible.
 */
class NdjsonFileTransport implements Transport {
  name = 'ndjson-file'
  private stream: fs.WriteStream | null = null
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
    const dir = path.dirname(this.filePath)
    fs.mkdirSync(dir, { recursive: true })
    // Synchronous pre-flight: createWriteStream opens lazily, so a bad path
    // would only surface via an async 'error' event — by which time the
    // server is up and the agent is reading an empty log file. Open/close
    // synchronously here so a bad LOG_FILE_PATH throws at boot.
    fs.closeSync(fs.openSync(this.filePath, 'a'))
    this.stream = fs.createWriteStream(this.filePath, { flags: 'a' })
    this.stream.on('error', err => {
      console.error(`NdjsonFileTransport stream error: ${err.message}`)
      this.stream?.destroy()
      this.stream = null
    })
  }

  log(level: string, message: string, timestamp: string, context: Record<string, unknown>): void {
    if (!this.stream) return
    let line: string
    try {
      line = safeStringify({ ...context, level, message, timestamp }, true, 0) + '\n'
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`NdjsonFileTransport serialize error: ${msg}`)
      return
    }
    this.stream.write(line)
  }

  cleanup(): void {
    this.stream?.end()
    this.stream = null
  }

  flush(): Promise<void> {
    return new Promise(resolve => {
      if (!this.stream) return resolve()
      const s = this.stream
      this.stream = null
      s.end(() => resolve())
    })
  }
}

let fileTransport: NdjsonFileTransport | null = null

function buildTransports(): Transport[] | undefined {
  if (!logToFile) return undefined // let Logger use its defaults
  fileTransport = new NdjsonFileTransport(logFilePath)
  return [new ConsoleTransport(), fileTransport]
}

export const logger = new Logger({
  level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  transports: buildTransports(),
})

/**
 * Flush pending log writes to disk. Resolves once the file stream has drained.
 * No-op when `LOG_TO_FILE` is unset. Safe to call multiple times.
 */
export async function flushLogs(): Promise<void> {
  await fileTransport?.flush()
  fileTransport = null
}

// QueryLogger for potential future Kysely integration
export const queryLogger = new QueryLogger(logger, {
  slowQueryThreshold: 150,
  logDebugQueries: process.env.NODE_ENV === 'development',
})
