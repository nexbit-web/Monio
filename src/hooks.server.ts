import { redirect, type Handle } from '@sveltejs/kit';
import { resolveUser, SESSION_COOKIE } from '$lib/server/auth';

const PUBLIC_ROUTES = ['/login', '/register'];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await resolveUser(event.cookies.get(SESSION_COOKIE));

	const isPublic = PUBLIC_ROUTES.includes(event.url.pathname);

	if (!event.locals.user && !isPublic) {
		const target = event.url.pathname + event.url.search;
		redirect(303, `/login?redirectTo=${encodeURIComponent(target)}`);
	}

	if (event.locals.user && isPublic) {
		redirect(303, '/');
	}

	return resolve(event);
};
