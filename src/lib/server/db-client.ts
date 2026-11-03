import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './prisma/client.ts';

/**
 * Единственный способ создать клиент БД — для CRM, бота и seed.
 *
 * Пул маленький и долгоживущий: каждое новое подключение к Neon проходит SCRAM-аутентификацию,
 * это заметно грузит процессор. Пачка одновременных рукопожатий на слабой машине (например, пока
 * Vite пересобирает зависимости) не укладывается в лимит, и Neon отвечает «Authentication timed out».
 * Поэтому держим до 4 подключений и не закрываем их 5 минут простоя.
 */
export function createDb(connectionString: string): PrismaClient {
	return new PrismaClient({
		adapter: new PrismaPg({
			connectionString,
			max: 4,
			idleTimeoutMillis: 5 * 60_000,
			connectionTimeoutMillis: 20_000
		})
	});
}
