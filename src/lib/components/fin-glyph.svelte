<script lang="ts">
	/**
	 * Знаки категорий и счетов — свои, сплошные, как иконки приложений в ClickUp:
	 * белая фигура на цветной плитке, детали вырезаны (fill-rule="evenodd"), а не
	 * дорисованы линиями. Сетка 24×24, скругления везде, где есть угол.
	 * Цвет — currentColor, его задаёт плитка.
	 */
	import type { IconKey } from '$lib/icon-keys';

	let { name, size = 16 }: { name: IconKey | 'transfer' | 'unknown'; size?: number } = $props();
</script>

{#snippet line(d: string, width = 2.2, opacity = 1)}
	<path
		{d}
		fill="none"
		stroke="currentColor"
		stroke-width={width}
		stroke-linecap="round"
		stroke-linejoin="round"
		{opacity}
	/>
{/snippet}

{#snippet car()}
	<!-- машина сбоку: кузов с вырезами окон и арками колёс, колёса с дисками -->
	<path
		fill-rule="evenodd"
		d="M4.3 11.6 7.2 11l2.1-3.1a1.6 1.6 0 0 1 1.32-.7h4.6a1.6 1.6 0 0 1 1.2.55L19 11l1.6.4a1.6 1.6 0 0 1 1.2 1.55V15a1.2 1.2 0 0 1-1.2 1.2h-.28A3.1 3.1 0 0 0 14.28 16.2h-3.76A3.1 3.1 0 0 0 4.48 16.2H4.2A1.2 1.2 0 0 1 3 15v-1.9a1.5 1.5 0 0 1 1.3-1.5ZM10.2 8.6h1.9V11H8.7ZM13.4 8.6h1.6a.8.8 0 0 1 .62.3L17.4 11h-4Z"
	/>
	<path
		fill-rule="evenodd"
		d="M7.5 14.5a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 1 0 0-4.8Zm0 1.6a.8.8 0 1 0 0 1.6.8.8 0 1 0 0-1.6ZM17.3 14.5a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 1 0 0-4.8Zm0 1.6a.8.8 0 1 0 0 1.6.8.8 0 1 0 0-1.6Z"
	/>
{/snippet}

<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
	{#if name === 'groceries'}
		<path
			d="M6.1 7.2h14.1a1 1 0 0 1 .97 1.24l-1.4 5.6a2 2 0 0 1-1.94 1.51H9.35a2 2 0 0 1-1.96-1.6Z"
		/>
		{@render line('M2.8 4.2h2a1 1 0 0 1 .98.8l1.9 9.6')}
		<circle cx="9.6" cy="19.2" r="1.8" />
		<circle cx="17.2" cy="19.2" r="1.8" />
	{:else if name === 'cafe'}
		{@render line('M6.5 3v4.6a2.5 2.5 0 0 0 5 0V3M9 3v4M9 10.1V21')}
		<path d="M15.2 3.6c0-.6.7-.9 1.1-.5 1.7 1.6 2.7 4.2 2.7 7.2V13a.8.8 0 0 1-.8.8h-3Z" />
		{@render line('M16.9 13v8', 2.4)}
	{:else if name === 'coffee'}
		<path d="M4 8.5h12.5V14a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" />
		{@render line('M16.5 10h1.3a2.5 2.5 0 0 1 0 5h-1.3')}
		{@render line('M8.5 2.8c-.9 1 .9 2.1 0 3.2M12.5 2.8c-.9 1 .9 2.1 0 3.2', 1.8, 0.8)}
		{@render line('M3.5 21.3H17', 2)}
	{:else if name === 'drinks'}
		<path d="M7 3h10l-.3 5a4.7 4.7 0 0 1-9.4 0Z" />
		{@render line('M12 12.8V19M8.5 20.6h7')}
	{:else if name === 'transport'}
		<!-- автобус спереди: окно и фары вырезаны -->
		<path
			fill-rule="evenodd"
			d="M7.5 2.5h9A2.5 2.5 0 0 1 19 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a2.5 2.5 0 0 1 2.5-2.5ZM7 6v5h10V6ZM8.6 13.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 1 0 0-2.2Zm6.8 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 1 0 0-2.2Z"
		/>
		<path
			d="M6.4 18.6h2.8V20a1 1 0 0 1-1 1h-.8a1 1 0 0 1-1-1Zm8.4 0h2.8V20a1 1 0 0 1-1 1h-.8a1 1 0 0 1-1-1Z"
		/>
	{:else if name === 'car'}
		<g transform="translate(0 -1.25)">{@render car()}</g>
	{:else if name === 'taxi'}
		<g transform="translate(0 -0.6)">
			{@render car()}
			<path
				d="M11.4 5.2h1.2a.6.6 0 0 1 .6.6v1H10.8v-1a.6.6 0 0 1 .6-.6Z"
				transform="translate(.6 0)"
			/>
		</g>
	{:else if name === 'fuel'}
		<path
			fill-rule="evenodd"
			d="M6.5 3h6A1.5 1.5 0 0 1 14 4.5V20H5V4.5A1.5 1.5 0 0 1 6.5 3ZM7 5.4v3.8h5V5.4Z"
		/>
		{@render line(
			'M3.5 20.6h12M14 8.2h1.5a1.3 1.3 0 0 1 1.3 1.3v6a1.2 1.2 0 0 0 2.4 0V9l-2-2.4',
			2
		)}
	{:else if name === 'travel'}
		<path
			d="M12 2.5c.9 0 1.6 1 1.6 2.4v4.3l7 4.1c.3.2.4.5.4.8v1.2c0 .4-.4.6-.7.5l-6.7-2.1v3.9l2 1.5c.2.2.3.4.3.6v.9c0 .3-.3.6-.6.5L12 19.9l-3.3 1.2c-.3.1-.6-.1-.6-.5v-.9c0-.2.1-.5.3-.6l2-1.5v-3.9l-6.7 2.1c-.3.1-.7-.1-.7-.5v-1.2c0-.3.2-.6.4-.8l7-4.1V4.9c0-1.4.7-2.4 1.6-2.4Z"
		/>
	{:else if name === 'home'}
		<!-- дом: скруглённые конёк и углы, дверь — вырез снизу -->
		<path
			d="M10.6 3.6a2.2 2.2 0 0 1 2.8 0l6.6 5.5c.6.5 1 1.2 1 2V19a2 2 0 0 1-2 2h-4v-5a1.6 1.6 0 0 0-1.6-1.6h-2.8A1.6 1.6 0 0 0 9 16v5H5a2 2 0 0 1-2-2v-7.9c0-.8.4-1.5 1-2Z"
		/>
	{:else if name === 'utilities'}
		<path
			d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.6.5.9 1.1.9 1.8v.6h6V16c0-.7.3-1.3.9-1.8A6.5 6.5 0 0 0 12 2.5Z"
		/>
		{@render line('M9.4 19.1h5.2M10.4 21.4h3.2', 2)}
	{:else if name === 'mobile'}
		<path
			fill-rule="evenodd"
			d="M8.2 2h7.6a2.7 2.7 0 0 1 2.7 2.7v14.6a2.7 2.7 0 0 1-2.7 2.7H8.2a2.7 2.7 0 0 1-2.7-2.7V4.7A2.7 2.7 0 0 1 8.2 2ZM7.8 4.6v12h8.4v-12ZM12 17.8a1 1 0 1 0 0 2 1 1 0 1 0 0-2Z"
		/>
	{:else if name === 'internet'}
		{@render line(
			'M2.8 9.4a13 13 0 0 1 18.4 0M6 12.7a8.5 8.5 0 0 1 12 0M9.1 16a4.1 4.1 0 0 1 5.8 0',
			2.4
		)}
		<circle cx="12" cy="19.4" r="1.7" />
	{:else if name === 'subscriptions'}
		{@render line('M19.6 10.5A7.7 7.7 0 0 0 6 7.2M4.4 13.5A7.7 7.7 0 0 0 18 16.8', 2.4)}
		<path
			d="M4.7 3.6v4.6h4.6ZM19.3 20.4v-4.6h-4.6Z"
			stroke="currentColor"
			stroke-width="1.2"
			stroke-linejoin="round"
		/>
	{:else if name === 'health'}
		<path
			fill-rule="evenodd"
			d="M12 20.6s-8.6-5-8.6-11.1A4.8 4.8 0 0 1 12 6.7a4.8 4.8 0 0 1 8.6 2.8c0 6.1-8.6 11.1-8.6 11.1ZM11 9.6h2v2h2v2h-2v2h-2v-2H9v-2h2Z"
		/>
	{:else if name === 'sport'}
		<rect x="2.2" y="9.3" width="2.6" height="5.4" rx="1.1" />
		<rect x="5.4" y="6.5" width="3.4" height="11" rx="1.4" />
		<rect x="8.4" y="10.9" width="7.2" height="2.2" />
		<rect x="15.2" y="6.5" width="3.4" height="11" rx="1.4" />
		<rect x="19.2" y="9.3" width="2.6" height="5.4" rx="1.1" />
	{:else if name === 'beauty'}
		<path
			d="M10 3.2l1.5 4.3a2 2 0 0 0 1.2 1.2l4.3 1.5-4.3 1.5a2 2 0 0 0-1.2 1.2L10 17.2l-1.5-4.3a2 2 0 0 0-1.2-1.2L3 10.2l4.3-1.5a2 2 0 0 0 1.2-1.2Z"
		/>
		<path
			d="M17.5 13.6l.8 2.2a1 1 0 0 0 .6.6l2.1.6-2.1.7a1 1 0 0 0-.6.6l-.8 2.1-.8-2.1a1 1 0 0 0-.6-.6l-2.1-.7 2.1-.6a1 1 0 0 0 .6-.6Z"
		/>
	{:else if name === 'clothes'}
		<path
			d="M8.6 3.5c.6 1.4 1.9 2.2 3.4 2.2s2.8-.8 3.4-2.2l4.5 1.9c.6.3.9 1 .7 1.6l-1 2.9c-.2.6-.9.9-1.5.7l-1.4-.5V19a1.6 1.6 0 0 1-1.6 1.6H9.4A1.6 1.6 0 0 1 7.8 19v-7.9l-1.4.5c-.6.2-1.3-.1-1.5-.7l-1-2.9c-.2-.6.1-1.3.7-1.6Z"
		/>
	{:else if name === 'fun'}
		<!-- билет с отрывной частью -->
		<path
			fill-rule="evenodd"
			d="M4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4V7.5A1.5 1.5 0 0 1 4.5 6ZM15 8.2a.8.8 0 1 0 0 1.6.8.8 0 1 0 0-1.6Zm0 3a.8.8 0 1 0 0 1.6.8.8 0 1 0 0-1.6Zm0 3a.8.8 0 1 0 0 1.6.8.8 0 1 0 0-1.6Z"
		/>
	{:else if name === 'games'}
		<path
			fill-rule="evenodd"
			d="M7.6 6.8h8.8a5 5 0 0 1 4.9 5.9l-.7 3.7a2.4 2.4 0 0 1-4.1 1.3l-2.2-2.4H9.7l-2.2 2.4a2.4 2.4 0 0 1-4.1-1.3l-.7-3.7a5 5 0 0 1 4.9-5.9ZM7.1 9.6h1.3V11h1.4v1.3H8.4v1.4H7.1v-1.4H5.7V11h1.4ZM15.6 9.7a.95.95 0 1 0 0 1.9.95.95 0 1 0 0-1.9Zm2.1 2.2a.95.95 0 1 0 0 1.9.95.95 0 1 0 0-1.9Z"
		/>
	{:else if name === 'gifts'}
		<path
			fill-rule="evenodd"
			d="M4.5 7.5h15a1 1 0 0 1 1 1V11a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V8.5a1 1 0 0 1 1-1ZM11.2 7.5v4h1.6v-4Z"
		/>
		<path
			fill-rule="evenodd"
			d="M5 12.8h14V19a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 19ZM11.2 12.8v8h1.6v-8Z"
		/>
		<path
			d="M12 7.4C10.9 4.7 7.6 4 7.6 5.9c0 1.3 2.2 1.5 4.4 1.5Zm0 0c1.1-2.7 4.4-3.4 4.4-1.5 0 1.3-2.2 1.5-4.4 1.5Z"
		/>
	{:else if name === 'family'}
		<!-- двое взрослых и ребёнок между ними -->
		<circle cx="6" cy="5.9" r="2.4" />
		<circle cx="18" cy="5.9" r="2.4" />
		<circle cx="12" cy="11.6" r="1.9" />
		<path
			d="M2.6 19.6v-5.6a3.4 3.4 0 0 1 6.8 0v5.6a.9.9 0 0 1-.9.9h-5a.9.9 0 0 1-.9-.9ZM14.6 19.6v-5.6a3.4 3.4 0 0 1 6.8 0v5.6a.9.9 0 0 1-.9.9h-5a.9.9 0 0 1-.9-.9ZM10.3 19.8v-2.5a1.7 1.7 0 0 1 3.4 0v2.5a.7.7 0 0 1-.7.7h-2a.7.7 0 0 1-.7-.7Z"
		/>
	{:else if name === 'charity'}
		<!-- сердце над раскрытой ладонью -->
		<path
			d="M12 11.6C8.6 9.2 6.9 7.6 6.9 5.6a2.6 2.6 0 0 1 5.1-.8 2.6 2.6 0 0 1 5.1.8c0 2-1.7 3.6-5.1 6Z"
		/>
		<rect x="2.2" y="13.4" width="3.2" height="7.4" rx="1" />
		{@render line('M6.9 14.6l3.4-1.3a2 2 0 0 1 1.4 0l3 1.2a1.25 1.25 0 0 1-.9 2.35L11.4 16.1', 2)}
		{@render line('M6.9 19.6h6.4a3 3 0 0 0 2-.75l4.6-4a1.35 1.35 0 0 0-1.8-2l-2.9 2.2', 2)}
	{:else if name === 'education'}
		<path
			d="M12 3.6 2.5 8.4 12 13.2l9.5-4.8Z"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linejoin="round"
		/>
		<path d="M6.2 11.2v3.9c0 1.8 2.6 3.3 5.8 3.3s5.8-1.5 5.8-3.3v-3.9L12 14.1Z" />
		{@render line('M21.2 8.6v5.2', 1.8)}
		<circle cx="21.2" cy="15" r="1.2" />
	{:else if name === 'kids'}
		<!-- мишка: уши, глаза и нос вырезаны -->
		<circle cx="6.8" cy="7.4" r="2.6" />
		<circle cx="17.2" cy="7.4" r="2.6" />
		<path
			fill-rule="evenodd"
			d="M12 6.4a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 1 0 0-13.6ZM9.5 11.3a1 1 0 1 0 0 2 1 1 0 1 0 0-2Zm5 0a1 1 0 1 0 0 2 1 1 0 1 0 0-2ZM10.6 15h2.8a.3.3 0 0 1 .2.5l-1.4 1.3a.3.3 0 0 1-.4 0l-1.4-1.3a.3.3 0 0 1 .2-.5Z"
		/>
	{:else if name === 'pets'}
		<path
			d="M12 12.3c-2.7 0-5.6 2.7-5.6 5.3 0 1.7 1.2 2.4 2.7 2.4 1.2 0 1.9-.6 2.9-.6s1.7.6 2.9.6c1.5 0 2.7-.7 2.7-2.4 0-2.6-2.9-5.3-5.6-5.3Z"
		/>
		<ellipse cx="8.6" cy="8" rx="1.8" ry="2.3" />
		<ellipse cx="15.4" cy="8" rx="1.8" ry="2.3" />
		<ellipse cx="4.9" cy="12" rx="1.6" ry="2" />
		<ellipse cx="19.1" cy="12" rx="1.6" ry="2" />
	{:else if name === 'tech'}
		<path
			fill-rule="evenodd"
			d="M5 3.5h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2ZM5.2 5.7v9.1h13.6V5.7Z"
		/>
		<path d="M10.2 17h3.6l.5 2.6H9.7Z" />
		{@render line('M8 20.6h8', 2)}
	{:else if name === 'household'}
		<!-- диван: спинка, подлокотники и сиденье с зазорами -->
		<rect x="6.6" y="5.8" width="10.8" height="6.6" rx="2.4" />
		<rect x="2.6" y="9.6" width="3.4" height="8.2" rx="1.7" />
		<rect x="18" y="9.6" width="3.4" height="8.2" rx="1.7" />
		<rect x="6.6" y="13.2" width="10.8" height="4.6" rx="1" />
		{@render line('M4.3 18.6v1.6M19.7 18.6v1.6', 2)}
	{:else if name === 'smoking'}
		<g transform="translate(0 1.2)">
			<rect x="2.6" y="13.4" width="12.6" height="3.6" rx="1" />
			<rect x="16" y="13.4" width="4.4" height="3.6" rx="1" />
			{@render line('M17.6 10.6c0-1.6 1.6-1.6 1.6-3.2s-1.6-1.6-1.6-3.2', 1.8, 0.85)}
		</g>
	{:else if name === 'bank'}
		<path
			d="M12 2.6a1 1 0 0 1 .47.12l8 4.2A1 1 0 0 1 21 7.8V9a.6.6 0 0 1-.6.6H3.6A.6.6 0 0 1 3 9V7.8a1 1 0 0 1 .53-.88l8-4.2A1 1 0 0 1 12 2.6Z"
		/>
		<rect x="4.5" y="10.8" width="2.2" height="6.2" rx=".5" />
		<rect x="8.8" y="10.8" width="2.2" height="6.2" rx=".5" />
		<rect x="13" y="10.8" width="2.2" height="6.2" rx=".5" />
		<rect x="17.3" y="10.8" width="2.2" height="6.2" rx=".5" />
		<rect x="3" y="17.8" width="18" height="2.6" rx=".8" />
	{:else if name === 'salary'}
		<path d="M9 6.6V5.4A1.4 1.4 0 0 1 10.4 4h3.2A1.4 1.4 0 0 1 15 5.4v1.2h-1.7v-.9h-2.6v.9Z" />
		<path
			fill-rule="evenodd"
			d="M5 7.4h14a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.4a2 2 0 0 1 2-2ZM3 12.6v1.1h7.6v-1.1Zm10.4 0v1.1H21v-1.1Z"
		/>
	{:else if name === 'freelance'}
		<path
			fill-rule="evenodd"
			d="M6.5 4h11A1.5 1.5 0 0 1 19 5.5V14H5V5.5A1.5 1.5 0 0 1 6.5 4ZM7 6v6h10V6Z"
		/>
		<path d="M2.5 15.4h19l-.6 2.2a1.8 1.8 0 0 1-1.74 1.3H4.84a1.8 1.8 0 0 1-1.74-1.3Z" />
	{:else if name === 'sidejob'}
		<!-- гаечный ключ: контур Lucide «wrench», залитый -->
		<path
			d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"
			stroke="currentColor"
			stroke-width="1"
			stroke-linejoin="round"
		/>
	{:else if name === 'party'}
		<!-- воздушный шар -->
		<ellipse cx="12" cy="9.4" rx="5.6" ry="6.6" />
		<path
			d="M10.9 15.6h2.2l-1.1 1.7Z"
			stroke="currentColor"
			stroke-width=".8"
			stroke-linejoin="round"
		/>
		{@render line('M12 17.6c-1.3 1.3 1.3 2.2 0 3.8', 1.6)}
	{:else if name === 'cashback'}
		<path
			fill-rule="evenodd"
			d="M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18ZM9.2 7.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2Zm5.6 5.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2ZM14.6 7.9l1.5 1.5-6.7 6.7-1.5-1.5Z"
		/>
	{:else if name === 'growth'}
		<rect x="3.8" y="13" width="4" height="7.6" rx="1.4" />
		<rect x="10" y="8.6" width="4" height="12" rx="1.4" />
		<rect x="16.2" y="3.6" width="4" height="17" rx="1.4" />
	{:else if name === 'refund'}
		{@render line('M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11', 2.4)}
	{:else if name === 'sale'}
		<path
			fill-rule="evenodd"
			d="M5 3h6.2a2 2 0 0 1 1.4.6l8.2 8.2a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0L3.6 12.6A2 2 0 0 1 3 11.2V5a2 2 0 0 1 2-2ZM7.6 6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2Z"
		/>
	{:else if name === 'card'}
		<path
			fill-rule="evenodd"
			d="M5 5h14a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 19 19H5a2.5 2.5 0 0 1-2.5-2.5v-9A2.5 2.5 0 0 1 5 5ZM2.5 8.6v2.2h19V8.6ZM5.6 14.2v1.7h4.2v-1.7Z"
		/>
	{:else if name === 'cash'}
		<path
			fill-rule="evenodd"
			d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 1 0 0-5.6ZM5.5 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2Zm13 0a1 1 0 1 0 0 2 1 1 0 1 0 0-2Z"
		/>
	{:else if name === 'savings'}
		<!-- копилка: контур Lucide «piggy-bank», залитый, глаз вырезан -->
		<path
			fill-rule="evenodd"
			d="M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zM16 9.2a.9.9 0 1 0 0 1.8.9.9 0 1 0 0-1.8Z"
		/>
		{@render line('M2 8v1a2 2 0 0 0 2 2h1', 1.8)}
	{:else if name === 'moneybag'}
		<!-- мешок с вырезанными чертами гривны -->
		<path d="M9 3h6l-1.6 3h-2.8Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round" />
		<path
			fill-rule="evenodd"
			d="M10.4 7h3.2c3.4 2 6.4 6 6.4 9.4 0 2.6-1.9 4.6-4.5 4.6h-7C5.9 21 4 19 4 16.4 4 13 7 9 10.4 7ZM9.6 13.2v1.3h4.8v-1.3Zm0 2.6v1.3h4.8v-1.3Z"
		/>
	{:else if name === 'coins'}
		<rect x="5.5" y="15.4" width="13" height="4.2" rx="2.1" />
		<rect x="5.5" y="10.4" width="13" height="4.2" rx="2.1" />
		<rect x="5.5" y="5.4" width="13" height="4.2" rx="2.1" />
	{:else if name === 'wallet'}
		<path
			d="M5.5 5H18a2 2 0 0 1 2 2v1.5h-4.5a3.5 3.5 0 0 0 0 7H20V17a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-9A2.5 2.5 0 0 1 5.5 5Z"
		/>
		<path
			fill-rule="evenodd"
			d="M15.5 10H21v4h-5.5a2 2 0 0 1 0-4Zm.1 1.1a.9.9 0 1 0 0 1.8.9.9 0 1 0 0-1.8Z"
		/>
	{:else if name === 'euro'}
		{@render line('M17.8 6.6a6.6 6.6 0 1 0 0 10.8M4.5 10.4h9M4.5 13.8h8', 2.4)}
	{:else if name === 'dollar'}
		{@render line(
			'M12 3v18M16.5 7.5c-.8-1.4-2.4-2.2-4.5-2.2-2.6 0-4.5 1.4-4.5 3.4 0 4.6 9.2 2.3 9.2 6.8 0 2-2 3.4-4.7 3.4-2.2 0-3.9-.9-4.7-2.4',
			2.4
		)}
	{:else if name === 'transfer'}
		{@render line('M4 8h14m-4-4 4 4-4 4M20 16H6m4-4-4 4 4 4', 2.4)}
	{:else if name === 'unknown'}
		{@render line('M9.2 9a2.9 2.9 0 1 1 4.1 2.7c-.8.4-1.3 1.1-1.3 2v.6', 2.4)}
		<circle cx="12" cy="17.6" r="1.4" />
	{:else}
		<!-- other: коробка из трёх граней с зазорами -->
		<path
			d="M12 2.8l8 3.9-8 4.1-8-4.1Z"
			stroke="currentColor"
			stroke-width="1"
			stroke-linejoin="round"
		/>
		<path d="M3.5 8.4 11.3 12.3v8.9L4.6 17.8A2 2 0 0 1 3.5 16Z" />
		<path d="M20.5 8.4 12.7 12.3v8.9l6.7-3.4a2 2 0 0 0 1.1-1.8Z" />
	{/if}
</svg>
