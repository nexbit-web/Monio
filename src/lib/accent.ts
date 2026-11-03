/**
 * Цвет темы Monio — выбирается в настройках, как в ClickUp.
 *
 * Хранится в cookie браузера отдельно для каждого пользователя (в названии —
 * его id), в базу ничего не пишем. Cookie, а не localStorage, — чтобы сервер
 * сразу отдал страницу нужного цвета, без вспышки чёрного сайдбара.
 */
import { getContext, setContext } from 'svelte';

/**
 * `color` — квадратик в настройках и кнопки. `rail` — верх сайдбара:
 * более глубокий и насыщенный оттенок того же цвета, как в ClickUp.
 */
export type Accent = {
	id: string;
	label: string;
	color: string;
	rail: string;
	/** Квадратик в настройках, если он отличается от `color`. */
	swatch?: string;
};

export const ACCENTS: Accent[] = [
	// Типовой: чёрный сайдбар без градиента, кнопки и фокус полей тоже чёрные.
	// Квадратик — графитовый, как в ClickUp: чёрный на тёмной теме сливался с фоном.
	{ id: 'black', label: 'Графит', color: '#111111', rail: '#111111', swatch: '#595d66' },
	{ id: 'violet', label: 'Фиолетовый', color: '#7b68ee', rail: '#5b45d6' },
	{ id: 'blue', label: 'Синий', color: '#1090e0', rail: '#0b73c2' },
	// Розовый снят пипеткой с ClickUp: #c81d62 вверху → #6b173d внизу.
	{ id: 'pink', label: 'Розовый', color: '#ee5e99', rail: '#c81d62' },
	{ id: 'purple', label: 'Пурпурный', color: '#b660e0', rail: '#9233c4' },
	{ id: 'periwinkle', label: 'Сиреневый', color: '#6985ff', rail: '#4a63e6' },
	{ id: 'orange', label: 'Оранжевый', color: '#e16b16', rail: '#c9560c' },
	{ id: 'teal', label: 'Бирюзовый', color: '#0f9d9f', rail: '#0b8587' },
	{ id: 'mocha', label: 'Мокко', color: '#aa8d80', rail: '#8c6f62' },
	// Зелёный Monio — #238636.
	{ id: 'green', label: 'Зелёный', color: '#238636', rail: '#1c6e2c' }
];

export const DEFAULT_ACCENT = 'black';

/** Название cookie — своё для каждого пользователя. */
export function accentCookie(userId: string): string {
	return `monio-accent-${userId}`;
}

/** Только известные цвета; что-то чужое в cookie — типовой чёрный. */
export function parseAccent(value: string | null | undefined): string {
	return ACCENTS.some((accent) => accent.id === value) ? (value as string) : DEFAULT_ACCENT;
}

/** Сайдбар сверху вниз: заданный цвет вверху, тот же на 54 % яркости внизу. */
function railGradient(top: string): string {
	return `linear-gradient(180deg,${top} 0%,color-mix(in srgb,${top} 54%,black) 100%)`;
}

/**
 * CSS-переменные темы для выбранного цвета. Для чёрного — ничего: остаются
 * типовые из app.css. Для остальных сайдбар переливается сверху вниз, как в
 * ClickUp: вверху глубокий насыщенный цвет, внизу — тот же, но вдвое темнее.
 * Главные кнопки и фиолетовые акценты перекрашиваются в цвет квадратика.
 *
 * В тёмной теме сайдбар приглушён — глубокий тёмный оттенок, чтобы не
 * кричал рядом с чёрной страницей.
 */
export function accentCss(id: string): string {
	const accent = ACCENTS.find((item) => item.id === id);
	if (!accent || accent.id === DEFAULT_ACCENT) return '';

	const { color: c, rail } = accent;
	// Тёмная тема, снято с фиолетового ClickUp: вверху тот же цвет на 39 %
	// яркости (#5a43d4 → #221b52), внизу он тает в почти чёрный (#16152b).
	const dimTop = `color-mix(in srgb,${rail} 39%,black)`;
	const dimBottom = `color-mix(in srgb,${dimTop} 45%,#111111)`;

	// `:root:root` и `:root.dark` — сильнее, чем `:root` и `.dark` из app.css.
	// Тёмное правило идёт вторым и перекрывает светлое.
	return (
		`:root:root,:root.dark{--rail:${rail};--rail-bg:${railGradient(rail)};--primary:${c};--primary-foreground:#ffffff;--ring:${c};--violet:${c};--violet-soft:color-mix(in oklab,${c} 75%,white);}` +
		`:root.dark{--rail:${dimTop};--rail-bg:linear-gradient(180deg,${dimTop} 0%,${dimBottom} 100%);}`
	);
}

/** Выбранный цвет и способ его сменить — макет делится им со страницами. */
export type AccentState = { readonly current: string; set(id: string): void };

const KEY = Symbol('accent');

export function provideAccent(state: AccentState): void {
	setContext(KEY, state);
}

export function useAccent(): AccentState {
	return getContext<AccentState>(KEY);
}
