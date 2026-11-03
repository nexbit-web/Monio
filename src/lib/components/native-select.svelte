<script lang="ts">
	/** Нативный select в стиле Input: работает без JS и отлично ведёт себя на телефоне. */
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	let { value = $bindable(), class: className, children, ...rest }: HTMLSelectAttributes = $props();
</script>

<select
	bind:value
	class={cn(
		'h-8 w-full min-w-0 rounded-lg border-[1.5px] border-input bg-transparent px-2 text-base transition-colors outline-none focus-visible:border-primary disabled:opacity-50 md:text-sm dark:bg-input/30 [&>option]:bg-popover',
		className
	)}
	{...rest}
>
	{@render children?.()}
</select>
