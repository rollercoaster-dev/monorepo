# rd-logger Context

Package-specific context for Claude Code when working in `packages/rd-logger/`.

**npm**: `@rollercoaster-dev/rd-logger`

## Purpose

Neurodivergent-friendly structured logging library with colored output, icons, and request context propagation.

## Key Patterns

### Log Levels

Use the standard levels: `debug`, `info`, `warn`, `error`, `fatal`

```typescript
import { Logger } from "@rollercoaster-dev/rd-logger";
const logger = new Logger({ level: "debug" });
logger.info("Message", { context: "value" });
```

### QueryLogger

Track database performance with slow query warnings:

```typescript
import { QueryLogger } from "@rollercoaster-dev/rd-logger";
const queryLogger = new QueryLogger(logger, { slowQueryThreshold: 150 });
queryLogger.logQuery(sql, params, duration, "PostgreSQL", requestId);
```

### Framework Adapters

- **Hono**: `createHonoMiddleware(logger)` for Hono apps
- **Express**: `createExpressMiddleware(logger)` for Express apps
- **Generic**: `withRequestContext()` for wrapping code blocks

## Testing

Use `bun test` from this directory or `bun --filter rd-logger test` from root.

## Conventions

- Colors and icons improve readability for neurodivergent users
- Request IDs propagate through the entire request lifecycle
- QueryLogger stats track total/slow/failed queries
