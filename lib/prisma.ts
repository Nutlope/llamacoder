import { PrismaClient } from "@prisma/client";
import { cache } from "react";

export const getPrisma = cache(() => {
  return new PrismaClient();
});
