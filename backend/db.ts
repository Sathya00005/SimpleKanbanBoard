import { PrismaClient } from '@prisma/client';

// Instantiate PrismaClient
const prisma = new PrismaClient();

// Export the specific 'user' client for consistency with the original import alias
export const user = prisma.user;
