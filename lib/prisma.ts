import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

declare global {
  var prisma: PrismaClient | undefined;
}

const neon = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(neon);
const client = new PrismaClient({ adapter });

export default client;

// const client = globalThis.prisma || new PrismaClient({ adapter });
// if (process.env.NODE_ENV !== "production") globalThis.prisma = client;
// console.log({ client });

// export default client;
