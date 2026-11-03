/**
 * Повтор запросов к Telegram, когда сбой временный: Telegram просит подождать
 * (429 Too Many Requests, retry_after), отвечает 5xx или моргнула сеть.
 * Так ответ бота не теряется из-за секундного сбоя.
 *
 * getUpdates не трогаем — long polling grammY перезапускает сам.
 */
import { HttpError, type Transformer } from 'grammy';

export type RetryOptions = {
	/** сколько раз повторить после первой попытки */
	retries?: number;
	/** дольше ждать не будем — лучше показать ошибку, чем висеть */
	maxDelayMs?: number;
	sleep?: (ms: number) => Promise<void>;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function autoRetry({
	retries = 3,
	maxDelayMs = 10_000,
	sleep = wait
}: RetryOptions = {}): Transformer {
	return async (prev, method, payload, signal) => {
		if (method === 'getUpdates') return prev(method, payload, signal);

		for (let attempt = 0; ; attempt++) {
			const last = attempt >= retries;
			let delay: number;
			try {
				const res = await prev(method, payload, signal);
				if (res.ok || last) return res;
				if (res.error_code === 429) delay = (res.parameters?.retry_after ?? 1) * 1000;
				else if (res.error_code >= 500) delay = 500 * 2 ** attempt;
				else return res;
				if (delay > maxDelayMs) return res;
			} catch (err) {
				if (!(err instanceof HttpError) || last) throw err;
				delay = 500 * 2 ** attempt;
			}
			await sleep(delay);
		}
	};
}
