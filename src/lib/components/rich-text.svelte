<script lang="ts">
	/**
	 * Текст с жирными местами: «Свободно **264 ₴**» — между ** жирным.
	 * Без {@html}: в текстах бывают названия категорий, а это ввод пользователя.
	 */
	let { text }: { text: string } = $props();
	const parts = $derived(text.split('**'));
</script>

{#each parts as part, i (i)}{#if i % 2}<b class="font-semibold text-foreground">{part}</b
		>{:else}{part}{/if}{/each}
