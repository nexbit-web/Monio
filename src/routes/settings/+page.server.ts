import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { botUsername, createLinkCode, isBotConfigured } from '$lib/server/telegram';
import { isTimezone } from '$lib/date';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const links = await db.telegramLink.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: 'asc' }
	});

	return {
		profile: { name: user.name ?? '', email: user.email, timezone: user.timezone },
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
