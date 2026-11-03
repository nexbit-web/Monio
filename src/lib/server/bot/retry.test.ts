import { HttpError } from 'grammy';
import { describe, expect, it, vi } from 'vitest';
import { autoRetry } from './retry.ts';

type Response = {
	ok: boolean;
	result?: unknown;
	error_code?: number;
	description?: string;
	parameters?: { retry_after?: number };
};

/** Telegram, который отвечает по очереди заданными ответами. */
function telegram(...answers: (Response | Error)[]) {
	const prev = vi.fn(async () => {
		const next = answers.shift();
		if (!next) throw new Error('ответы кончились');
		if (next instanceof Error) throw next;
		return next;
	});
	return prev;
}

const OK = { ok: true, result: true };
const call = (
	retry: ReturnType<typeof autoRetry>,
	prev: ReturnType<typeof telegram>,
	method = 'sendMessage'
) => retry(prev as never, method as never, {} as never);

describe('autoRetry', () => {
	it('429 — ждёт, сколько просит Telegram, и повторяет', async () => {
		const sleep = vi.fn(async () => {});
		const prev = telegram({ ok: false, error_code: 429, parameters: { retry_after: 2 } }, OK);
		expect(await call(autoRetry({ sleep }), prev)).toEqual(OK);
		expect(sleep).toHaveBeenCalledWith(2000);
		expect(prev).toHaveBeenCalledTimes(2);
	});

	it('5xx — повторяет с нарастающей паузой', async () => {
		const sleep = vi.fn(async () => {});
		const prev = telegram({ ok: false, error_code: 502 }, { ok: false, error_code: 500 }, OK);
		expect(await call(autoRetry({ sleep }), prev)).toEqual(OK);
		expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([500, 1000]);
	});

	it('сеть моргнула — повторяет', async () => {
		const sleep = vi.fn(async () => {});
		const prev = telegram(new HttpError('сеть', new Error('ECONNRESET')), OK);
		expect(await call(autoRetry({ sleep }), prev)).toEqual(OK);
	});

	it('сеть лежит дольше — после попыток отдаёт ошибку', async () => {
		const sleep = vi.fn(async () => {});
		const err = () => new HttpError('сеть', new Error('ETIMEDOUT'));
		const prev = telegram(err(), err(), err(), err());
		await expect(call(autoRetry({ sleep, retries: 3 }), prev)).rejects.toBeInstanceOf(HttpError);
		expect(prev).toHaveBeenCalledTimes(4);
	});

	it('после всех попыток возвращает последний ответ Telegram', async () => {
		const sleep = vi.fn(async () => {});
		const fail = { ok: false, error_code: 500, description: 'Internal' };
		const prev = telegram(fail, fail, fail);
		expect(await call(autoRetry({ sleep, retries: 2 }), prev)).toEqual(fail);
		expect(prev).toHaveBeenCalledTimes(3);
	});

	it('400 — ошибка в запросе, повторять бессмысленно', async () => {
		const sleep = vi.fn(async () => {});
		const bad = { ok: false, error_code: 400, description: 'Bad Request' };
		const prev = telegram(bad);
		expect(await call(autoRetry({ sleep }), prev)).toEqual(bad);
		expect(sleep).not.toHaveBeenCalled();
	});

	it('слишком долгое ожидание — не висим, сразу отдаём ответ', async () => {
		const sleep = vi.fn(async () => {});
		const slow = { ok: false, error_code: 429, parameters: { retry_after: 60 } };
		const prev = telegram(slow);
		expect(await call(autoRetry({ sleep, maxDelayMs: 10_000 }), prev)).toEqual(slow);
		expect(sleep).not.toHaveBeenCalled();
	});

	it('не HTTP-ошибка (баг) не повторяется', async () => {
		const prev = telegram(new TypeError('баг'));
		await expect(call(autoRetry({ sleep: async () => {} }), prev)).rejects.toBeInstanceOf(
			TypeError
		);
		expect(prev).toHaveBeenCalledTimes(1);
	});

	it('getUpdates не трогаем — polling повторяет сам', async () => {
		const sleep = vi.fn(async () => {});
		const fail = { ok: false, error_code: 502 };
		const prev = telegram(fail);
		expect(await call(autoRetry({ sleep }), prev, 'getUpdates')).toEqual(fail);
		expect(sleep).not.toHaveBeenCalled();
	});
});
