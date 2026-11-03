import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { initializeUser } from '$lib/server/finance/defaults';
import { DEFAULT_TZ } from '$lib/date';
import { accentCookie, parseAccent, DEFAULT_ACCENT } from '$lib/accent';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const user = locals.user;
	if (!user)
		return { user: null, tz: DEFAULT_TZ, categories: [], accounts: [], accent: DEFAULT_ACCENT };

	// Старым аккаунтам и тем, кто зарегистрировался до появления категорий, создаём стартовый набор.
	if (!user.initializedAt) await initializeUser(db, user.id);

	const order = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }];
	const [categories, accounts] = await Promise.all([
		db.category.findMany({
			where: { userId: user.id, archived: false },
			select: { id: true, kind: true, name: true, icon: true },
			orderBy: order
		}),
		db.account.findMany({
			where: { userId: user.id, archived: false },
			select: { id: true, name: true, icon: true, isDefault: true },
			orderBy: order
		})
	]);

	return {
		user: { id: user.id, email: user.email, name: user.name },
		tz: user.timezone,
		categories,
		accounts,
		// цвет темы — из cookie, чтобы страница пришла сразу нужного цвета
		accent: parseAccent(cookies.get(accentCookie(user.id)))
	};
};
