import { Logger, QueryLogger, JsonFormatter } from '@rollercoaster-dev/rd-logger'

const logToFile = process.env.LOG_TO_FILE === 'true'
const logFilePath = process.env.LOG_FILE_PATH || '.tmp/server.log'
const useJsonFormat = process.env.LOG_FORMAT === 'json'

export const logger = new Logger({
  level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  logToFile,
  logFilePath,
  ...(useJsonFormat && { formatter: new JsonFormatter() }),
})

// QueryLogger for potential future Kysely integration
export const queryLogger = new QueryLogger(logger, {
  slowQueryThreshold: 150,
  logDebugQueries: process.env.NODE_ENV === 'development',
})
