import { isLang, LANG_COOKIE, type Lang } from './docs';
import type { PageServerLoad } from './$types';

/**
 * Язык справки: из ссылки (?lang=en) — и запоминаем его; иначе тот, что
 * выбрали в прошлый раз; иначе русский.
 */
export const load: PageServerLoad = ({ url, cookies }) => {
	const asked = url.searchParams.get('lang');
	if (isLang(asked)) {
		cookies.set(LANG_COOKIE, asked, {
			path: '/help',
			maxAge: 60 * 60 * 24 * 365,
			httpOnly: true,
			sameSite: 'lax'
		});
		return { lang: asked };
	}
	const saved = cookies.get(LANG_COOKIE);
	return { lang: (isLang(saved) ? saved : 'ru') as Lang };
};
