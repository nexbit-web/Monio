import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import {
	activeSessions,
	checkPassword,
	hashPassword,
	loginLimits,
	passwordProblem,
	revokeOtherSessions,
	verifyPassword
} from '$lib/server/auth';
import { KNOWN_PASSWORDS } from '$lib/server/password';
import { waitText } from '$lib/server/rate-limit';
import { botUsername, createLinkCode, isBotConfigured } from '$lib/server/telegram';
import { isTimezone } from '$lib/date';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const links = await db.telegramLink.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: 'asc' }
	});

	const [sessions, knownPassword] = await Promise.all([
		activeSessions(user.id),
		usesKnownPassword(user.passwordHash)
	]);

	return {
		profile: { name: user.name ?? '', email: user.email, timezone: user.timezone },
		security: {
			sessions,
			// пароль, который знают все (демо из открытого кода и т.п.)
			knownPassword,
			// почта демо-аккаунта опубликована в коде — половина входа уже известна
			demoEmail: user.email === DEMO_EMAIL
		},
		telegram: {
			configured: isBotConfigured(),
			username: await botUsername(),
			links: links.map((l) => ({
				// BigInt не сериализуется в JSON — отдаём строкой
				telegramId: l.telegramId.toString(),
				username: l.username,
				firstName: l.firstName,
				createdAt: l.createdAt
			}))
		}
	};
};

const DEMO_EMAIL = 'demo@moneta.local';

async function usesKnownPassword(hash: string): Promise<boolean> {
	// проверяем только самые вероятные, каждая проверка — scrypt (~50 мс)
	for (const p of KNOWN_PASSWORDS.slice(0, 2)) if (await verifyPassword(hash, p)) return true;
	return false;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const securitySchema = z.object({
	email: z.string().trim().toLowerCase().max(200).regex(EMAIL, 'Некорректная почта'),
	newPassword: z.string().max(200).default(''),
	repeatPassword: z.string().max(200).default(''),
	currentPassword: z.string().min(1, 'Введи текущий пароль').max(200)
});

const profileSchema = z.object({
	name: z.string().trim().max(60),
	timezone: z.string().max(60).refine(isTimezone, 'Неизвестный часовой пояс')
});

export const actions: Actions = {
	profile: async ({ request, locals }) => {
		const parsed = profileSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success)
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Проверь поля' });
		await db.user.update({
			where: { id: locals.user!.id },
			data: { name: parsed.data.name || null, timezone: parsed.data.timezone }
		});
		return { saved: true };
	},

	/** Смена почты и/или пароля. Нужен текущий пароль; после — остальные устройства выходят. */
	security: async (event) => {
		const user = event.locals.user!;
		const parsed = securitySchema.safeParse(Object.fromEntries(await event.request.formData()));
		if (!parsed.success)
			return fail(400, { securityError: parsed.error.issues[0]?.message ?? 'Проверь поля' });
		const f = parsed.data;

		const key = user.email;
		const wait = loginLimits.email.blockedFor(key);
		if (wait > 0)
			return fail(429, { securityError: `Слишком много попыток. Попробуй ${waitText(wait)}.` });
		if (!(await checkPassword(user.passwordHash, f.currentPassword))) {
			loginLimits.email.hit(key);
			return fail(400, { securityError: 'Текущий пароль неверный' });
		}

		const emailChanged = f.email !== user.email;
		if (!emailChanged && !f.newPassword)
			return fail(400, { securityError: 'Нечего менять: впиши новую почту или новый пароль' });

		const data: { email?: string; passwordHash?: string } = {};
		if (f.newPassword) {
			const weak = passwordProblem(f.newPassword, f.email);
			if (weak) return fail(400, { securityError: weak });
			if (f.newPassword !== f.repeatPassword)
				return fail(400, { securityError: 'Новые пароли не совпадают' });
			if (await verifyPassword(user.passwordHash, f.newPassword))
				return fail(400, { securityError: 'Новый пароль совпадает со старым' });
			data.passwordHash = await hashPassword(f.newPassword);
		}
		if (emailChanged) {
			if (await db.user.findUnique({ where: { email: f.email }, select: { id: true } }))
				return fail(400, { securityError: 'Эта почта уже занята' });
			data.email = f.email;
		}

		await db.user.update({ where: { id: user.id }, data });
		loginLimits.email.reset(key);
		const revoked = await revokeOtherSessions(user.id, event);
		return { securitySaved: true, revoked };
	},

	signOutOthers: async (event) => {
		const revoked = await revokeOtherSessions(event.locals.user!.id, event);
		return { revoked };
	},

	telegramLink: async ({ locals }) => {
		if (!isBotConfigured())
			return fail(400, { message: 'Бот не настроен: нет TELEGRAM_BOT_TOKEN' });
		const { code, expiresAt } = await createLinkCode(locals.user!.id);
		const username = await botUsername();
		return {
			link: {
				code,
				expiresAt,
				url: username ? `https://t.me/${username}?start=${code}` : null
			}
		};
	},

	telegramUnlink: async ({ request, locals }) => {
		const raw = String((await request.formData()).get('id') ?? '');
		if (!/^\d{1,20}$/.test(raw)) return fail(400, { message: 'Некорректный id' });
		await db.telegramLink.deleteMany({
			where: { telegramId: BigInt(raw), userId: locals.user!.id }
		});
		return { unlinked: true };
	}
};
