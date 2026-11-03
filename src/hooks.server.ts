import { redirect, type Handle } from '@sveltejs/kit';
import { resolveUser, SESSION_COOKIE } from '$lib/server/auth';

const PUBLIC_ROUTES = ['/login', '/register'];
/** Вебхук Telegram защищён собственным секретом, сессия ему не нужна. */
const PUBLIC_PREFIXES = ['/api/telegram'];
/** Адреса прежнего фитнес-приложения — остались в истории и закладках браузера. */
const LEGACY_ROUTES = ['/today', '/workout', '/dashboard', '/progress', '/verdict'];

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	event.locals.user = null;

	if (LEGACY_ROUTES.some((p) => path === p || path.startsWith(`${p}/`))) redirect(308, '/');

	if (!PUBLIC_PREFIXES.some((p) => path.startsWith(p))) {
		event.locals.user = await resolveUser(event.cookies.get(SESSION_COOKIE));
		const isPublic = PUBLIC_ROUTES.includes(path);

		if (!event.locals.user && !isPublic) {
			const target = path + event.url.search;
			redirect(303, `/login?redirectTo=${encodeURIComponent(target)}`);
		}

		if (event.locals.user && isPublic) {
			redirect(303, '/');
		}
	}

	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	return response;
};
