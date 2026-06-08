import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

function makeClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL is not set')
  const filePath = dbUrl.startsWith('file:') ? dbUrl.slice(5) : dbUrl
  const adapter = new PrismaBetterSqlite3({ url: filePath })
  return new PrismaClient({ adapter, log: ['error'] })
}

const g = globalThis as unknown as { prisma?: PrismaClient }

function getClient(): PrismaClient {
  if (!g.prisma) g.prisma = makeClient()
  return g.prisma
}

// Proxy defers client creation to first use (request time, not module-import/build time).
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    return getClient()[prop as keyof PrismaClient]
  },
})
