import { error, fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { createSession, hashPassword } from '$lib/server/auth';
import { initializeUser } from '$lib/server/finance/defaults';
import type { Actions, PageServerLoad } from './$types';

/** На публичном хостинге регистрацию стоит закрыть: ALLOW_REGISTRATION=false в .env. */
const registrationOpen = () => env.ALLOW_REGISTRATION !== 'false';

export const load: PageServerLoad = async () => {
	if (!registrationOpen()) error(403, 'Регистрация закрыта');
};

export const actions: Actions = {
	default: async (event) => {
		if (!registrationOpen())
			return fail(403, { email: '', name: '', message: 'Регистрация закрыта' });

		const form = await event.request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase()
			.slice(0, 200);
		const password = String(form.get('password') ?? '');
		const name = String(form.get('name') ?? '')
			.trim()
			.slice(0, 60);

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
			return fail(400, { email, name, message: 'Некорректная почта' });
		if (password.length < 8 || password.length > 200)
			return fail(400, { email, name, message: 'Пароль — от 8 символов' });

		const exists = await db.user.findUnique({ where: { email } });
		if (exists) return fail(400, { email, name, message: 'Такая почта уже зарегистрирована' });

		const user = await db.user.create({
			data: { email, name: name || null, passwordHash: await hashPassword(password) }
		});
		await initializeUser(db, user.id);

		await createSession(user.id, event);
		redirect(303, '/');
	}
};
