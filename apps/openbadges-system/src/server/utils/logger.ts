/**
 * Logger utility for openbadges-system
 *
 * Uses @rollercoaster-dev/rd-logger for structured, neurodivergent-friendly logging
 * with request correlation support.
 */

import { Logger } from '@rollercoaster-dev/rd-logger'
import type { LogLevel } from '@rollercoaster-dev/rd-logger'

export const logger = new Logger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
})
