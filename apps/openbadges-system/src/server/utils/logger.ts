import { Logger, QueryLogger } from '@rollercoaster-dev/rd-logger'

export const logger = new Logger({
  level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
})

// QueryLogger for potential future Kysely integration
export const queryLogger = new QueryLogger(logger, {
  slowQueryThreshold: 150,
  logDebugQueries: process.env.NODE_ENV === 'development',
})
