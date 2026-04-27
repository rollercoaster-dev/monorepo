import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

// We re-import the module under test inside each scenario so module-scoped
// env-var reads (`logToFile`, `logFilePath`) pick up the test-specific values.
async function loadFreshLoggerModule(envOverrides: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(envOverrides)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  vi.resetModules()
  return import('../logger')
}

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ndjson-transport-'))
}

describe('NdjsonFileTransport (via logger module)', () => {
  let tmpDir: string
  let logFile: string
  const originalEnv = { ...process.env }

  beforeEach(() => {
    tmpDir = makeTmpDir()
    logFile = path.join(tmpDir, 'server.log')
  })

  afterEach(async () => {
    const mod = await import('../logger').catch(() => null)
    await mod?.flushLogs?.()
    fs.rmSync(tmpDir, { recursive: true, force: true })
    for (const k of Object.keys(process.env)) {
      if (!(k in originalEnv)) delete process.env[k]
    }
    Object.assign(process.env, originalEnv)
  })

  it('writes one valid JSON object per line (NDJSON contract)', async () => {
    const { logger, flushLogs } = await loadFreshLoggerModule({
      LOG_TO_FILE: 'true',
      LOG_FILE_PATH: logFile,
      LOG_LEVEL: 'debug',
    })

    logger.info('first message', { requestId: 'a' })
    logger.warn('second message', { requestId: 'b' })
    await flushLogs()

    const contents = fs.readFileSync(logFile, 'utf8')
    const lines = contents.split('\n').filter(Boolean)
    expect(lines).toHaveLength(2)
    for (const line of lines) {
      expect(line).not.toContain('\n')
      const parsed = JSON.parse(line)
      expect(parsed).toHaveProperty('level')
      expect(parsed).toHaveProperty('message')
      expect(parsed).toHaveProperty('timestamp')
    }
    const [firstLine, secondLine] = lines as [string, string]
    expect(JSON.parse(firstLine).message).toBe('first message')
    expect(JSON.parse(secondLine).message).toBe('second message')
  })

  it('creates the parent directory recursively when missing', async () => {
    const nested = path.join(tmpDir, 'a', 'b', 'c', 'server.log')
    const { logger, flushLogs } = await loadFreshLoggerModule({
      LOG_TO_FILE: 'true',
      LOG_FILE_PATH: nested,
      LOG_LEVEL: 'info',
    })

    logger.info('hello nested')
    await flushLogs()

    expect(fs.existsSync(nested)).toBe(true)
    const parsed = JSON.parse(fs.readFileSync(nested, 'utf8').trim())
    expect(parsed.message).toBe('hello nested')
  })

  it('throws at construction when the log path cannot be opened (fail-fast)', async () => {
    // Point at a path whose parent is a regular file — mkdir will fail.
    const blockingFile = path.join(tmpDir, 'not-a-dir')
    fs.writeFileSync(blockingFile, 'x')
    const badPath = path.join(blockingFile, 'server.log')

    await expect(
      loadFreshLoggerModule({
        LOG_TO_FILE: 'true',
        LOG_FILE_PATH: badPath,
        LOG_LEVEL: 'info',
      })
    ).rejects.toThrow()
  })

  it('does not create a log file when LOG_TO_FILE is unset', async () => {
    const { logger, flushLogs } = await loadFreshLoggerModule({
      LOG_TO_FILE: undefined,
      LOG_FILE_PATH: logFile,
      LOG_LEVEL: 'info',
    })

    logger.info('console only')
    await flushLogs()

    expect(fs.existsSync(logFile)).toBe(false)
  })

  it('does not throw when a payload contains a BigInt (serialize errors are swallowed)', async () => {
    const { logger, flushLogs } = await loadFreshLoggerModule({
      LOG_TO_FILE: 'true',
      LOG_FILE_PATH: logFile,
      LOG_LEVEL: 'info',
    })

    expect(() => logger.info('big', { n: BigInt(1) as unknown as number })).not.toThrow()
    logger.info('after-big')
    await flushLogs()

    const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean)
    // The BigInt line is dropped; the following line still lands.
    expect(lines.some(l => JSON.parse(l).message === 'after-big')).toBe(true)
  })

  it('flushLogs is idempotent and safe to call without LOG_TO_FILE', async () => {
    const { flushLogs } = await loadFreshLoggerModule({
      LOG_TO_FILE: undefined,
      LOG_FILE_PATH: logFile,
    })
    await expect(flushLogs()).resolves.toBeUndefined()
    await expect(flushLogs()).resolves.toBeUndefined()
  })
})
