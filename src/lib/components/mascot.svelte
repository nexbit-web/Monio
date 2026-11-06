<script lang="ts">
	/**
	 * Мони — уточка Monio с монетой ₴ (assets/monio-duck.svg). Моргает, монетка
	 * покачивается и иногда переворачивается: анимация — внутри самого SVG и
	 * сама выключается, если в системе включено «уменьшить движение».
	 * Картинка одна на весь сайт — браузер скачивает её один раз.
	 */
	import duck from '$lib/assets/monio-duck.svg';

	let { size = 40, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<img
	src={duck}
	width={size}
	height={size}
	alt=""
	aria-hidden="true"
	draggable="false"
	class="mascot {className}"
/>

<style>
	.mascot {
		flex-shrink: 0;
		user-select: none;
	}
</style>
