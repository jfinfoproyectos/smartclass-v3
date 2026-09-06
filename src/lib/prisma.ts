import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Using globalThis to ensure the instance survives HMR in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

let prisma: PrismaClient;

const connectionString = process.env.DATABASE_URL!;

function createPool() {
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  pool.on("error", (err) => {
    // Evita crashes por desconexión en clientes ociosos (común en Postgres en la nube como Prisma Accelerate)
    console.warn("⚠️ Advertencia en pool de Postgres:", err.message);
  });

  return pool;
}

if (process.env.NODE_ENV === "production") {
  const pool = createPool();
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.prisma) {
    // Create pool once
    const pool = createPool();
    globalForPrisma.pgPool = pool;
    
    // Create adapter and client once
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
    
    console.log("🐘 Prisma Client & Connection Pool initialized (Singleton)");
  }
  prisma = globalForPrisma.prisma;
}

export default prisma;