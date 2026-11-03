/**
 * Ограничение попыток (скользящее окно, в памяти процесса). Нужно против
 * подбора пароля: после max неудач за windowMs ключ блокируется, пока самая
 * старая попытка не выйдет из окна.
 *
 * В памяти — значит, сбрасывается при перезапуске и не делится между
 * серверами. Для личной CRM на одном процессе этого достаточно.
 */
export type Limiter = {
	/** сколько мс ещё ждать; 0 — можно пробовать */
	blockedFor(key: string): number;
	/** записать неудачную попытку */
	hit(key: string): void;
	/** забыть ключ (например, после успешного входа) */
	reset(key: string): void;
};

export function createLimiter({
	max,
	windowMs,
	now = () => Date.now()
}: {
	max: number;
	windowMs: number;
	now?: () => number;
}): Limiter {
	const hits = new Map<string, number[]>();

	function fresh(key: string): number[] {
		const since = now() - windowMs;
		const list = (hits.get(key) ?? []).filter((t) => t > since);
		if (list.length) hits.set(key, list);
		else hits.delete(key);
		return list;
	}

	return {
		blockedFor(key) {
			const list = fresh(key);
			return list.length < max ? 0 : list[0] + windowMs - now();
		},
		hit(key) {
			// чтобы память не росла от перебора тысяч ключей, иногда чистим старые
			if (hits.size > 10_000) for (const k of [...hits.keys()]) fresh(k);
			hits.set(key, [...fresh(key), now()]);
		},
		reset(key) {
			hits.delete(key);
		}
	};
}

/** «через 14 мин» / «через 40 с» */
export function waitText(ms: number): string {
	const sec = Math.ceil(ms / 1000);
	return sec >= 60 ? `через ${Math.ceil(sec / 60)} мин` : `через ${sec} с`;
}
