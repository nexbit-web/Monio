import { env } from '$env/dynamic/private';
import { PrismaClient } from './prisma/client';
import { createDb } from './db-client';

const connectionString = env.DATABASE_URL;

if (!connectionString) {
	throw new Error('DATABASE_URL не задан. Скопируй .env.example в .env и вставь строку Neon.');
}

// В dev SvelteKit перезагружает модули — держим один клиент на процесс.
// Но перезапуск Vite после правки .env или `prisma generate` идёт в том же процессе:
// старый клиент смотрел бы в прежнюю базу или не знал новых таблиц. Тогда создаём заново.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaUrl?: string };

const cached = globalForPrisma.prisma;
const reusable = cached instanceof PrismaClient && globalForPrisma.prismaUrl === connectionString;

if (cached && !reusable) void cached.$disconnect().catch(() => {});

export const db = reusable ? cached : createDb(connectionString);

if (import.meta.env.DEV) {
	globalForPrisma.prisma = db;
	globalForPrisma.prismaUrl = connectionString;
}
