<script lang="ts">
	/**
	 * Картинка сайта: окно Monio в миниатюре — колонка разделов, цифры месяца,
	 * расходы по категориям и темп трат. Без надписей — она одна на все языки.
	 */
	let { label }: { label: string } = $props();

	const bars = [
		{ color: '#16b673', w: 150 },
		{ color: '#ff7a1a', w: 112 },
		{ color: '#3d7bff', w: 84 },
		{ color: '#ff6550', w: 62 },
		{ color: '#7c5cff', w: 40 }
	];
</script>

<svg class="art" viewBox="0 0 420 280" role="img" aria-label={label}>
	<!-- окно -->
	<rect
		x="1"
		y="1"
		width="418"
		height="278"
		rx="20"
		style="fill: var(--shell); stroke: var(--border)"
	/>
	<!-- колонка разделов -->
	<rect x="10" y="10" width="40" height="260" rx="10" style="fill: var(--rail)" />
	<circle cx="30" cy="32" r="10" fill="#ffc83d" />
	<rect x="22" y="52" width="16" height="16" rx="5" fill="#fff" opacity="0.22" />
	{#each [0, 1, 2, 3, 4] as i (i)}
		<rect
			x="21"
			y={80 + i * 28}
			width="18"
			height="18"
			rx="5"
			fill="#fff"
			opacity={i === 0 ? 1 : 0.35}
		/>
	{/each}
	<rect x="21" y="244" width="18" height="18" rx="5" fill="#fff" opacity="0.35" />

	<!-- рабочая панель -->
	<rect
		x="58"
		y="10"
		width="352"
		height="260"
		rx="12"
		style="fill: var(--card); stroke: var(--border)"
	/>
	<rect
		x="72"
		y="24"
		width="90"
		height="10"
		rx="5"
		style="fill: var(--foreground)"
		opacity="0.85"
	/>
	<rect x="330" y="21" width="66" height="16" rx="8" style="fill: var(--primary)" />

	<!-- цифры месяца -->
	{#each [{ c: '#16b673' }, { c: '#f43f5e' }, { c: '#3d7bff' }, { c: '#ffb800' }] as s, i (i)}
		<rect
			x={72 + i * 82}
			y="48"
			width="74"
			height="46"
			rx="9"
			style="fill: var(--block); stroke: var(--border)"
		/>
		<rect
			x={80 + i * 82}
			y="57"
			width="30"
			height="5"
			rx="2.5"
			style="fill: var(--muted-foreground)"
			opacity="0.5"
		/>
		<rect
			x={80 + i * 82}
			y="70"
			width="48"
			height="9"
			rx="4.5"
			style="fill: var(--foreground)"
			opacity="0.8"
		/>
		<rect x={80 + i * 82} y="84" width="22" height="4" rx="2" fill={s.c} />
	{/each}

	<!-- расходы по категориям -->
	<rect
		x="72"
		y="104"
		width="196"
		height="152"
		rx="9"
		style="fill: var(--block); stroke: var(--border)"
	/>
	<rect x="82" y="114" width="70" height="6" rx="3" style="fill: var(--foreground)" opacity="0.7" />
	{#each bars as b, i (i)}
		<rect x="82" y={132 + i * 24} width="14" height="14" rx="4" fill={b.color} />
		<rect x="102" y={136 + i * 24} width="156" height="6" rx="3" style="fill: var(--muted)" />
		<rect x="102" y={136 + i * 24} width={b.w} height="6" rx="3" fill={b.color} />
	{/each}

	<!-- темп трат -->
	<rect
		x="276"
		y="104"
		width="120"
		height="152"
		rx="9"
		style="fill: var(--block); stroke: var(--border)"
	/>
	<rect
		x="286"
		y="114"
		width="54"
		height="6"
		rx="3"
		style="fill: var(--foreground)"
		opacity="0.7"
	/>
	<path
		d="M288 236 C 304 230, 312 214, 326 206 S 352 182, 362 170 S 380 150, 386 140"
		fill="none"
		stroke="#8a94a6"
		stroke-width="2"
		stroke-dasharray="4 4"
		opacity="0.7"
	/>
	<path
		d="M288 238 C 300 226, 312 222, 324 210 S 346 196, 356 182"
		fill="none"
		stroke="#3d7bff"
		stroke-width="3"
		stroke-linecap="round"
	/>
	<circle cx="356" cy="182" r="4.5" fill="#3d7bff" style="stroke: var(--card)" stroke-width="2" />
</svg>

<style>
	.art {
		display: block;
		width: 100%;
		max-width: 440px;
		height: auto;
		margin: 0 auto;
		filter: drop-shadow(0 14px 24px rgba(0, 0, 0, 0.12));
	}
</style>
