import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createSession, hashPassword } from '$lib/server/auth';
import { fromISODate, todayISO } from '$lib/date';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');
		const name = String(form.get('name') ?? '').trim();
		const heightRaw = String(form.get('heightCm') ?? '').replace(',', '.');
		const startRaw = String(form.get('programStart') ?? '');

		if (!email.includes('@')) return fail(400, { email, name, message: 'Некорректная почта' });
		if (password.length < 8)
			return fail(400, { email, name, message: 'Пароль — минимум 8 символов' });

		const exists = await db.user.findUnique({ where: { email } });
		if (exists) return fail(400, { email, name, message: 'Такая почта уже зарегистрирована' });

		const height = Number(heightRaw);

		const user = await db.user.create({
			data: {
				email,
				name: name || null,
				passwordHash: await hashPassword(password),
				heightCm: Number.isFinite(height) && height > 0 ? height : null,
				programStartDate: fromISODate(/^\d{4}-\d{2}-\d{2}$/.test(startRaw) ? startRaw : todayISO())
			}
		});

		await createSession(user.id, event);
		redirect(303, '/today');
	}
};
