<script lang="ts">
	/**
	 * Полоска загрузки вверху экрана, пока SvelteKit грузит следующую страницу.
	 * Быстрые переходы её не показывают — иначе мигает на каждый клик.
	 */
	import { navigating } from '$app/state';

	let visible = $state(false);
	let done = $state(false);

	$effect(() => {
		if (navigating.to) {
			done = false;
			const t = setTimeout(() => (visible = true), 150);
			return () => clearTimeout(t);
		}
		if (visible) {
			done = true;
			const t = setTimeout(() => (visible = false), 300);
			return () => clearTimeout(t);
		}
	});
</script>

{#if visible}
	<div class="nav-progress" data-done={done || undefined} aria-hidden="true">
		<span class="nav-progress-peg"></span>
	</div>
{/if}
