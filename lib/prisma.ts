import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// Prisma v7 requires a driver adapter; PrismaBetterSqlite3 accepts { url } config.
// DATABASE_URL must be an absolute path in production (Docker sets CWD to /app).
function makeClient() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL is not set')

  // Strip file: prefix — adapter expects a plain filesystem path.
  const filePath = dbUrl.startsWith('file:') ? dbUrl.slice(5) : dbUrl
  const adapter = new PrismaBetterSqlite3({ url: filePath })

  return new PrismaClient({ adapter, log: ['error'] })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? makeClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
