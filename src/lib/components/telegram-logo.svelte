<script lang="ts">
	/** Логотип Telegram: голубой круг с белым самолётиком, их фирменный градиент. */
	let { size = 16, class: className = '' }: { size?: number; class?: string } = $props();

	const uid = $props.id();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	class="shrink-0 {className}"
	role="img"
	aria-label="Telegram"
>
	<defs>
		<linearGradient id="{uid}-tg" x1="0.5" y1="0" x2="0.5" y2="1">
			<stop offset="0" stop-color="#2aabee" />
			<stop offset="1" stop-color="#229ed9" />
		</linearGradient>
	</defs>
	<circle cx="12" cy="12" r="12" fill="url(#{uid}-tg)" />
	<path
		fill="#ffffff"
		d="M5.43 11.87c3.5-1.52 5.83-2.53 7-3.02 3.33-1.39 4.02-1.63 4.47-1.64.1 0 .32.02.47.14.12.1.15.23.17.32.02.1.04.3.02.46-.18 1.9-.96 6.5-1.36 8.62-.17.9-.5 1.2-.82 1.23-.7.06-1.22-.46-1.9-.9-1.05-.69-1.65-1.12-2.67-1.8-1.18-.77-.42-1.2.26-1.9.18-.18 3.24-2.97 3.3-3.22 0-.03.02-.15-.06-.21-.07-.06-.17-.04-.25-.02-.1.02-1.79 1.14-5.06 3.35-.48.33-.91.49-1.3.48-.43-.01-1.25-.24-1.86-.44-.75-.24-1.35-.37-1.3-.79.03-.21.33-.43.89-.66z"
	/>
</svg>
