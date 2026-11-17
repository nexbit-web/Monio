import { db } from '$lib/server/db';
import { prismaStore } from '$lib/server/bot/store';
import { loadAdvice } from '$lib/advisor';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const [advice, links] = await Promise.all([
		loadAdvice(prismaStore(db), { id: user.id, tz: user.timezone, goalUsd: user.goalUsd }),
		db.telegramLink.count({ where: { userId: user.id } })
	]);

	return {
		advice,
		reports: {
			telegram: links > 0,
			weekly: user.weeklyReport,
			monthly: user.monthlyReport
		}
	};
};
