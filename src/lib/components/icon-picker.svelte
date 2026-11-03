<script lang="ts">
	/** Сетка иконок для категории или счёта; выбранная — в кольце цвета темы. */
	import { ICON_META, iconKey, type IconKey } from '$lib/icon-keys';
	import FinIcon from './fin-icon.svelte';

	let {
		keys,
		value = $bindable(),
		name = 'icon'
	}: {
		keys: IconKey[];
		/** значение из базы; старое эмодзи тоже подсвечивается своей иконкой */
		value: string;
		name?: string;
	} = $props();

	const selected = $derived(iconKey(value, keys[0]));
</script>

<input type="hidden" {name} value={selected} />
<div class="flex flex-wrap gap-1" role="radiogroup" aria-label="Иконка">
	{#each keys as key (key)}
		<button
			type="button"
			role="radio"
			aria-checked={selected === key}
			aria-label={ICON_META[key].label}
			title={ICON_META[key].label}
			class="rounded-[10px] p-0.5 transition-colors outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring {selected ===
			key
				? 'ring-2 ring-violet'
				: ''}"
			onclick={() => (value = key)}
		>
			<FinIcon icon={key} size={30} />
		</button>
	{/each}
</div>
