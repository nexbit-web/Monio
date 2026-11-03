import { redirect } from '@sveltejs/kit';
import { destroySession } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async (event) => {
		await destroySession(event);
		redirect(303, '/login');
	}
};
