import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createSession, hashPassword, passwordProblem } from '$lib/server/auth';
import { initializeUser } from '$lib/server/finance/defaults';
import { registrationOpen } from '$lib/server/registration';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	if (!(await registrationOpen())) error(403, 'Регистрация закрыта');
};

export const actions: Actions = {
	default: async (event) => {
		if (!(await registrationOpen()))
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
		const weak = passwordProblem(password, email);
		if (weak) return fail(400, { email, name, message: weak });

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
