import { env } from '$env/dynamic/private';
import { db } from './db';

/**
 * Monio — личная CRM: регистрация открыта, только пока в базе нет ни одного
 * аккаунта (первый запуск). Дальше — лишь если явно разрешить
 * ALLOW_REGISTRATION=true в .env.
 */
export async function registrationOpen(): Promise<boolean> {
	if (env.ALLOW_REGISTRATION === 'true') return true;
	return (await db.user.count()) === 0;
}
