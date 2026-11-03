import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '$env/dynamic/private';
import { PrismaClient } from './prisma/client';

const connectionString = env.DATABASE_URL;

if (!connectionString) {
	throw new Error('DATABASE_URL не задан. Скопируй .env.example в .env и вставь строку Neon.');
}

const adapter = new PrismaPg({ connectionString });

// В dev SvelteKit перезагружает модули — держим один клиент на процесс.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (import.meta.env.DEV) globalForPrisma.prisma = db;
