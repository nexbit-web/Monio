<script lang="ts">
	/**
	 * Таблица «пишешь боту → что будет», по темам. Каждый пример можно
	 * скопировать и сразу отправить боту.
	 */
	import { getContext } from 'svelte';
	import Copy from './copy.svelte';
	import { HELP_LANG, UI, type Lang } from '../docs';

	let {
		groups
	}: {
		groups: { title?: string; rows: { say: string; get: string }[] }[];
	} = $props();

	const lang = getContext<(() => Lang) | undefined>(HELP_LANG);
	const th = $derived(UI[lang?.() ?? 'ru'].th);
</script>

<div class="wrap">
	<table>
		<thead>
			<tr><th>{th.say}</th><th>{th.get}</th></tr>
		</thead>
		{#each groups as g, i (i)}
			<tbody>
				{#if g.title}
					<tr class="group"><td colspan="2">{g.title}</td></tr>
				{/if}
				{#each g.rows as r (r.say)}
					<tr>
						<td class="say"><Copy text={r.say} /></td>
						<td>{r.get}</td>
					</tr>
				{/each}
			</tbody>
		{/each}
	</table>
</div>

<style>
	.wrap {
		margin: 20px 0;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: 12px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	th {
		padding: 9px 14px;
		text-align: left;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted-foreground);
		background: var(--table-head);
		border-bottom: 1px solid var(--border);
	}
	td {
		padding: 8px 14px;
		border-top: 1px solid var(--border);
		vertical-align: middle;
	}
	tbody:first-of-type tr:first-child td {
		border-top: 0;
	}
	.say {
		width: 1%;
		white-space: nowrap;
	}
	.group td {
		padding-top: 14px;
		padding-bottom: 6px;
		font-size: 11.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted-foreground);
		background: var(--card);
	}
	.group + tr td {
		border-top: 0;
	}
</style>
