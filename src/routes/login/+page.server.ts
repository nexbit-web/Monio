import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createSession, verifyPassword } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => ({
	redirectTo: url.searchParams.get('redirectTo') ?? '/'
});

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');
		const redirectTo = String(form.get('redirectTo') || '/');

		if (!email || !password) {
			return fail(400, { email, message: 'Введи почту и пароль' });
		}

		const user = await db.user.findUnique({ where: { email } });
		if (!user || !(await verifyPassword(user.passwordHash, password))) {
			return fail(400, { email, message: 'Неверная почта или пароль' });
		}

		await createSession(user.id, event);
		// только свои пути: «//evil.com» и «/\evil.com» браузер воспринял бы как чужой сайт
		redirect(303, /^\/(?![/\\])/.test(redirectTo) ? redirectTo : '/');
	}
};
