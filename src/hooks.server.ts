import { redirect, type Handle } from '@sveltejs/kit';
import { resolveUser, SESSION_COOKIE } from '$lib/server/auth';

const PUBLIC_ROUTES = ['/login', '/register'];
/** Вебхук Telegram защищён собственным секретом, сессия ему не нужна. */
const WEBHOOK = '/api/telegram';

/**
 * Заголовки безопасности для каждого ответа:
 * - страницу нельзя встроить в чужой сайт (кликджекинг);
 * - формы отправляются только на свой адрес, <base> и плагины запрещены;
 * - камера, микрофон, геолокация и платежи странице не нужны — выключены;
 * - адрес страницы не уходит на чужие сайты целиком;
 * - поисковики не индексируют личную CRM.
 */
const SECURITY_HEADERS = {
	'Content-Security-Policy':
		"frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'",
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
	'Cross-Origin-Opener-Policy': 'same-origin',
	'X-Robots-Tag': 'noindex, nofollow'
};

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Изменять данные можно только со своих страниц. SvelteKit проверяет это сам,
 * но лишь в собранной версии; здесь — то же правило и для `npm run dev`.
 * Вебхук Telegram приходит с серверов Telegram без Origin — у него свой секрет.
 */
function crossSite(request: Request, url: URL): boolean {
	if (!UNSAFE_METHODS.has(request.method) || url.pathname === WEBHOOK) return false;
	return request.headers.get('origin') !== url.origin;
}

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	event.locals.user = null;

	if (crossSite(event.request, event.url))
		return new Response('Cross-site requests are forbidden', {
			status: 403,
			headers: SECURITY_HEADERS
		});

	if (path !== WEBHOOK) {
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
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
	// браузер запомнит: только https, даже если набрать http:// (на localhost не нужно)
	if (event.url.protocol === 'https:')
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	return response;
};
