import type { LayoutServerLoad } from './$types';
import { deloadInfo } from '$lib/training';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) return { user: null, deload: null };

	return {
		user: { id: user.id, email: user.email, name: user.name },
		deload: deloadInfo(user.programStartDate, user.deloadEveryWeeks)
	};
};
