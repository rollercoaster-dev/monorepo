#!/usr/bin/env bun

import { Command } from 'commander'
import { DatabaseMigrator, validateMigrations } from '../database/migrations/migrator'

const program = new Command()

program.name('migrate').description('Database migration management CLI').version('1.0.0')

program
  .command('up')
  .description('Run all pending migrations')
  .action(async () => {
    const migrator = new DatabaseMigrator()
    const result = await migrator.migrateToLatest()

    if (result.success) {
      console.log('✅ Migrations completed successfully')
      result.results?.forEach(r => {
        console.log(`  ${r.migrationName}: ${r.status}`)
      })
    } else {
      console.error('❌ Migration failed:', result.error)
      process.exit(1)
    }
  })

program
  .command('down')
  .description('Rollback the last migration')
  .action(async () => {
    const migrator = new DatabaseMigrator()
    const result = await migrator.migrateDown()

    if (result.success) {
      console.log('✅ Rollback completed successfully')
      result.results?.forEach(r => {
        console.log(`  ${r.migrationName}: ${r.status}`)
      })
    } else {
      console.error('❌ Rollback failed:', result.error)
      process.exit(1)
    }
  })

program
  .command('reset')
  .description('Reset database and re-run all migrations')
  .action(async () => {
    const migrator = new DatabaseMigrator()
    const result = await migrator.resetDatabase()

    if (result.success) {
      console.log('✅ Database reset completed successfully')
    } else {
      console.error('❌ Database reset failed:', result.error)
      process.exit(1)
    }
  })

program
  .command('validate')
  .description('Validate migration files for cross-database compatibility')
  .action(async () => {
    const result = await validateMigrations()

    if (result.valid) {
      console.log('✅ All migrations are valid for both SQLite and PostgreSQL')
    } else {
      console.log('⚠️  Migration validation issues found:')
      result.issues.forEach(issue => console.log(`  - ${issue}`))
    }
  })

program
  .command('status')
  .description('Show migration status')
  .action(async () => {
    const migrator = new DatabaseMigrator()
    const executed = await migrator.getExecutedMigrations()
    const pending = await migrator.getPendingMigrations()

    console.log(`Executed migrations: ${executed.length}`)
    executed.forEach(m => console.log(`  ✅ ${m}`))

    console.log(`\nPending migrations: ${pending.length}`)
    pending.forEach(m => console.log(`  ⏳ ${m}`))
  })

program
  .command('create <name>')
  .description('Create a new migration file')
  .action(async (name: string) => {
    const migrator = new DatabaseMigrator()
    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your SQL here
`

    const filename = await migrator.createMigration(name, template)
    console.log(`✅ Created migration: ${filename}`)
  })

program.parse()
