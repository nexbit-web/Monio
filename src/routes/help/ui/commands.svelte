<script lang="ts">
	/** Команды бота таблицей: команду можно скопировать, рядом — та же кнопка в чате. */
	import { getContext } from 'svelte';
	import Copy from './copy.svelte';
	import { HELP_LANG, UI, type Lang } from '../docs';

	let { items }: { items: { cmd: string; key: string; text: string }[] } = $props();

	const lang = getContext<(() => Lang) | undefined>(HELP_LANG);
	const th = $derived(UI[lang?.() ?? 'ru'].th);
</script>

<div class="wrap">
	<table>
		<thead>
			<tr><th>{th.cmd}</th><th>{th.key}</th><th>{th.does}</th></tr>
		</thead>
		<tbody>
			{#each items as it (it.cmd)}
				<tr>
					<td class="nowrap"><Copy text={it.cmd} /></td>
					<td class="nowrap"><span class="key">{it.key}</span></td>
					<td>{it.text}</td>
				</tr>
			{/each}
		</tbody>
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
	tr:first-child td {
		border-top: 0;
	}
	.nowrap {
		width: 1%;
		white-space: nowrap;
	}
</style>
