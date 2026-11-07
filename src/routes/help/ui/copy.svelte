<script lang="ts">
	/**
	 * Пример сообщения для бота, который можно скопировать одним нажатием:
	 * текст уходит в буфер обмена, значок на секунду меняется на галочку.
	 */
	import { getContext } from 'svelte';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import { HELP_LANG, UI, type Lang } from '../docs';

	let { text }: { text: string } = $props();

	const lang = getContext<(() => Lang) | undefined>(HELP_LANG);
	const ui = $derived(UI[lang?.() ?? 'ru']);

	let done = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			return; // буфер недоступен (старый браузер, нет доступа) — просто ничего не делаем
		}
		done = true;
		clearTimeout(timer);
		timer = setTimeout(() => (done = false), 1400);
	}
</script>

<!-- Обёртка держит невидимую подпись «Скопировано» у кнопки: без неё
     подпись (position: absolute) считается от окна и даёт странице лишнюю прокрутку. -->
<span class="holder">
	<button
		type="button"
		class="copy"
		class:done
		onclick={copy}
		title={done ? ui.copied : ui.copy}
		aria-label="{ui.copy}: {text}"
	>
		<code>{text}</code>
		<span class="icon" aria-hidden="true">
			{#if done}<Check size={13} strokeWidth={2.5} />{:else}<CopyIcon size={13} />{/if}
		</span>
	</button>
	<span class="sr-only" aria-live="polite">{done ? ui.copied : ''}</span>
</span>

<style>
	.holder {
		position: relative;
	}
	.copy {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		padding: 2px 6px 2px 8px;
		border: 1px solid var(--border);
		border-radius: 7px;
		background: var(--card);
		color: var(--foreground);
		vertical-align: baseline;
		transition:
			border-color 0.15s,
			background-color 0.15s;
	}
	.copy:hover {
		border-color: color-mix(in srgb, var(--foreground) 35%, var(--border));
	}
	.copy:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}
	code {
		padding: 0;
		background: none;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 12.5px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.icon {
		display: grid;
		flex-shrink: 0;
		color: var(--muted-foreground);
	}
	.copy.done .icon {
		color: var(--signal-green);
	}
	@media (prefers-reduced-motion: reduce) {
		.copy {
			transition: none;
		}
	}
</style>
