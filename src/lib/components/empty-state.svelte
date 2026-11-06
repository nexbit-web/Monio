<script lang="ts">
	import type { Snippet } from 'svelte';
	import Mascot from './mascot.svelte';

	let {
		title,
		text,
		children
	}: {
		title: string;
		text?: string;
		/** кнопки под текстом */
		children?: Snippet;
	} = $props();
</script>

<div class="grid place-items-center px-4 py-10 text-center">
	<div class="grid size-[76px] place-items-center rounded-[14px] border bg-card">
		<Mascot size={56} />
	</div>
	<p class="mt-5 text-[17px] font-semibold tracking-tight">{title}</p>
	{#if text}<p class="mt-1.5 max-w-md text-[13px] text-muted-foreground">{text}</p>{/if}
	{#if children}<div class="mt-5 flex flex-wrap justify-center gap-2">
			{@render children()}
		</div>{/if}
</div>
