import type { Component } from 'svelte';

/**
 * Тости в стилі ClickUp: темна картка в лівому нижньому куті робочої панелі.
 *
 * Два вигляди — обирається сам:
 * - короткий рядок: «Знижку видалено.» (+ «Скасувати Ctrl Z», якщо є undo);
 * - картка: заголовок зі значком, рядок опису («**LL-2K4F7B** → Відправлено»)
 *   і кнопки дій із гарячими цифрами (3 2 1 — праворуч головна).
 *
 * Виклики — як у колишній бібліотеці: toast.success('Збережено'),
 * toast.error(message); решта — через другий аргумент.
 */

export type ToastTone = 'success' | 'error' | 'info' | 'warning' | 'loading' | 'neutral';

export type ToastAction = {
	label: string;
	run: () => unknown;
};

export type ToastOptions = {
	/** Той самий id — тост оновлюється на місці, а не дублюється. */
	id?: string;
	/** Жирна частина опису: назва, номер замовлення. */
	subject?: string;
	description?: string;
	/** Кнопки знизу картки; остання — головна (біла, клавіша 1). */
	actions?: ToastAction[];
	/** «Скасувати» з Ctrl Z. */
	undo?: () => unknown;
	/** Скільки показувати, мс. Infinity — поки не закриють. */
	duration?: number;
	/** Свій значок замість значка тону, і колір кружечка під ним. */
	icon?: Component;
	iconClass?: string;
};

export type ToastItem = ToastOptions & { id: string; tone: ToastTone; title: string };

const DURATION: Record<ToastTone, number> = {
	success: 4000,
	neutral: 5000,
	info: 5000,
	warning: 6000,
	error: 6000,
	loading: Infinity
};

/** Більше на екрані не тримаємо — найстаріші йдуть першими. */
const MAX_VISIBLE = 4;

type Timer = { handle?: ReturnType<typeof setTimeout>; remaining: number; started: number };

class ToastStore {
	items = $state<ToastItem[]>([]);
	#timers = new Map<string, Timer>();
	#paused = false;
	#seq = 0;

	show(tone: ToastTone, title: string, options: ToastOptions = {}): string {
		const id = options.id ?? `toast-${++this.#seq}`;
		const item: ToastItem = { ...options, id, tone, title };

		const index = this.items.findIndex((existing) => existing.id === id);
		if (index >= 0) {
			this.items[index] = item;
		} else {
			const next = [...this.items, item];
			for (const dropped of next.slice(0, Math.max(0, next.length - MAX_VISIBLE))) {
				this.#clear(dropped.id);
			}
			this.items = next.slice(-MAX_VISIBLE);
		}

		// З діями чи undo — довше: людині треба встигнути прочитати й натиснути.
		const interactive = Boolean(options.actions?.length || options.undo);
		const duration = options.duration ?? (interactive ? 8000 : DURATION[tone]);
		this.#schedule(id, duration);
		return id;
	}

	dismiss(id?: string) {
		if (id === undefined) {
			for (const key of this.#timers.keys()) this.#clear(key);
			this.items = [];
			return;
		}
		this.#clear(id);
		this.items = this.items.filter((item) => item.id !== id);
	}

	/** Курсор над тостом — час зупиняється, щоб не зник з-під руки. */
	pause() {
		if (this.#paused) return;
		this.#paused = true;
		const now = Date.now();
		for (const timer of this.#timers.values()) {
			clearTimeout(timer.handle);
			timer.handle = undefined;
			timer.remaining -= now - timer.started;
		}
	}

	resume() {
		if (!this.#paused) return;
		this.#paused = false;
		for (const [id, timer] of this.#timers) this.#start(id, timer);
	}

	#schedule(id: string, duration: number) {
		this.#clear(id);
		if (!Number.isFinite(duration)) return;
		const timer: Timer = { remaining: duration, started: Date.now() };
		this.#timers.set(id, timer);
		if (!this.#paused) this.#start(id, timer);
	}

	#start(id: string, timer: Timer) {
		timer.started = Date.now();
		timer.handle = setTimeout(() => this.dismiss(id), Math.max(timer.remaining, 1000));
	}

	#clear(id: string) {
		clearTimeout(this.#timers.get(id)?.handle);
		this.#timers.delete(id);
	}
}

export const toasts = new ToastStore();

type Show = (title: string, options?: ToastOptions) => string;

const toast = {
	success: ((title, options) => toasts.show('success', title, options)) as Show,
	error: ((title, options) => toasts.show('error', title, options)) as Show,
	info: ((title, options) => toasts.show('info', title, options)) as Show,
	warning: ((title, options) => toasts.show('warning', title, options)) as Show,
	loading: ((title, options) => toasts.show('loading', title, options)) as Show,
	/** Нейтральний рядок без значка: «Товар видалено.» */
	message: ((title, options) => toasts.show('neutral', title, options)) as Show,
	dismiss: (id?: string) => toasts.dismiss(id)
};

export default toast;
