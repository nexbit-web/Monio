<script lang="ts">
	/** Как считается остаток счёта — формула плашками. */
	let {
		terms
	}: {
		/** начальный остаток, доходы, расходы, переводы, итог */
		terms: [string, string, string, string, string];
	} = $props();

	const ops = ['', '+', '−', '±'];
</script>

<div
	class="formula"
	role="img"
	aria-label="{terms[0]} + {terms[1]} − {terms[2]} ± {terms[3]} = {terms[4]}"
>
	{#each terms.slice(0, 4) as term, i (term)}
		{#if ops[i]}<span class="op">{ops[i]}</span>{/if}
		<span class="term">{term}</span>
	{/each}
	<span class="op">=</span>
	<span class="term result">{terms[4]}</span>
</div>

<style>
	.formula {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
	.term {
		padding: 7px 12px;
		border: 1px solid var(--border);
		border-radius: 9px;
		background: var(--card);
		font-size: 13.5px;
		font-weight: 500;
		white-space: nowrap;
	}
	.term.result {
		border-color: var(--primary);
		background: var(--primary);
		color: var(--primary-foreground);
	}
	.op {
		font-size: 17px;
		color: var(--muted-foreground);
	}
</style>
