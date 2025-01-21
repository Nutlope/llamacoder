import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

declare global {
  var prisma: PrismaClient | undefined;
}

const neon = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(neon);

let client: PrismaClient;

if (process.env.NODE_ENV !== "production") {
  client = globalThis.prisma || new PrismaClient({ adapter });
  globalThis.prisma = client;
} else {
  client = new PrismaClient({ adapter });
}

export default client;
