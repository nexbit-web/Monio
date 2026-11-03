import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { checkPassword, createSession, loginLimits } from '$lib/server/auth';
import { waitText } from '$lib/server/rate-limit';
import { registrationOpen } from '$lib/server/registration';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => ({
	redirectTo: url.searchParams.get('redirectTo') ?? '/',
	canRegister: await registrationOpen()
});

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase()
			.slice(0, 200);
		const password = String(form.get('password') ?? '').slice(0, 200);
		const redirectTo = String(form.get('redirectTo') || '/');

		if (!email || !password) {
			return fail(400, { email, message: 'Введи почту и пароль' });
		}

		const emailKey = email;
		const ipKey = event.getClientAddress();
		const wait = Math.max(loginLimits.email.blockedFor(emailKey), loginLimits.ip.blockedFor(ipKey));
		if (wait > 0) {
			return fail(429, {
				email,
				message: `Слишком много попыток входа. Попробуй ${waitText(wait)}.`
			});
		}

		const user = await db.user.findUnique({ where: { email } });
		// пароль проверяем и для несуществующей почты — ответ идёт столько же времени
		if (!(await checkPassword(user?.passwordHash, password)) || !user) {
			loginLimits.email.hit(emailKey);
			loginLimits.ip.hit(ipKey);
			return fail(400, { email, message: 'Неверная почта или пароль' });
		}

		loginLimits.email.reset(emailKey);
		await createSession(user.id, event);
		// только свои пути: «//evil.com» и «/\evil.com» браузер воспринял бы как чужой сайт
		redirect(303, /^\/(?![/\\])/.test(redirectTo) ? redirectTo : '/');
	}
};
