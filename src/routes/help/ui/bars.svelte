<script lang="ts">
	/** Картинка лимитов: категории с полосой «потрачено из лимита», перебор — красным. */
	import FinIcon from '$lib/components/fin-icon.svelte';
	import { formatMoney } from '$lib/money';

	let {
		items,
		of,
		over,
		title
	}: {
		/** суммы — в гривнах */
		items: { icon: string; name: string; spent: number; limit: number }[];
		/** «из» */
		of: string;
		/** «сверх лимита» */
		over: string;
		title: string;
	} = $props();

	const money = (uah: number) => formatMoney(uah * 100);
</script>

<figure class="bars" aria-label={title}>
	<p class="head">{title}</p>
	{#each items as item (item.name)}
		{@const pct = Math.round((item.spent / item.limit) * 100)}
		{@const isOver = item.spent > item.limit}
		<div class="row">
			<FinIcon icon={item.icon} size={28} />
			<div class="main">
				<div class="line">
					<span class="name">{item.name}</span>
					<span class="sum" class:over={isOver}>
						{money(item.spent)} <span class="of">{of} {money(item.limit)}</span>
					</span>
				</div>
				<div class="track">
					<span class="fill" class:over={isOver} style:width="{Math.min(100, pct)}%"></span>
				</div>
				{#if isOver}<span class="warn">⚠️ {over} {money(item.spent - item.limit)}</span>{/if}
			</div>
		</div>
	{/each}
</figure>

<style>
	.bars {
		display: grid;
		gap: 14px;
		width: 100%;
		max-width: 390px;
		margin: 0 auto;
		padding: 18px;
		border-radius: 14px;
		background: var(--card);
		border: 1px solid var(--border);
	}
	.head {
		margin: 0 !important;
		font-size: 14px;
		font-weight: 650;
	}
	.row {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}
	.main {
		display: grid;
		flex: 1;
		gap: 6px;
		min-width: 0;
	}
	.line {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		font-size: 13px;
	}
	.name {
		font-weight: 550;
	}
	.sum {
		font-weight: 600;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.sum.over {
		color: var(--destructive);
	}
	.of {
		font-weight: 400;
		color: var(--muted-foreground);
	}
	.track {
		height: 8px;
		border-radius: 8px;
		background: var(--muted);
		overflow: hidden;
	}
	.fill {
		display: block;
		height: 100%;
		border-radius: 8px;
		background: var(--signal-green);
	}
	.fill.over {
		background: var(--destructive);
	}
	.warn {
		font-size: 12px;
		color: var(--destructive);
	}
</style>
