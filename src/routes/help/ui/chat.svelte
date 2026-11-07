<script lang="ts">
	/**
	 * Картинка переписки с ботом: шапка чата, сообщения, кнопки под ответом
	 * бота и клавиатура внизу. Спокойные нейтральные цвета — это схема, а не
	 * скриншот. Ничего не нажимается. `numbered` — номера на кнопках, чтобы
	 * подписать их рядом.
	 */
	import Mascot from '$lib/components/mascot.svelte';
	import type { Btn, Msg } from '../examples';

	let {
		messages,
		keyboard,
		numbered = false,
		label
	}: {
		messages: Msg[];
		keyboard?: Btn[][];
		numbered?: boolean;
		/** что показано на картинке — для экранного диктора */
		label: string;
	} = $props();

	const text = (b: Btn) => (typeof b === 'string' ? b : b.text);
	const tone = (b: Btn) => (typeof b === 'string' ? '' : b.tone);

	/** «**жирный** обычный» → куски с пометкой жирного. */
	const parts = (line: string) => line.split('**').map((t, i) => ({ t, b: i % 2 === 1 }));

	/** номер кнопки по порядку во всём чате (для подписей рядом) */
	const numbers = $derived.by(() => {
		const map = new Map<string, number>();
		let n = 0;
		messages.forEach((msg, m) => {
			if (msg.from === 'bot')
				msg.buttons?.forEach((row, r) => row.forEach((_, c) => map.set(`${m}:${r}:${c}`, ++n)));
		});
		return map;
	});
</script>

<figure class="chat" role="img" aria-label={label}>
	<div class="head">
		<Mascot size={30} />
		<div class="who"><b>Monio</b><span>бот</span></div>
	</div>

	<div class="body">
		{#each messages as msg, m (m)}
			{#if msg.from === 'me'}
				<div class="bubble me">{msg.text}<span class="time">{msg.time}</span></div>
			{:else}
				<div class="bot">
					<div class="bubble in">
						{#each msg.lines as line, l (l)}
							{#if line}
								<p>
									{#each parts(line) as part, p (p)}{#if part.b}<b>{part.t}</b
											>{:else}{part.t}{/if}{/each}
								</p>
							{:else}
								<p class="gap"></p>
							{/if}
						{/each}
						<span class="time">{msg.time}</span>
					</div>
					{#if msg.buttons}
						<div class="buttons">
							{#each msg.buttons as row, r (r)}
								<div class="row">
									{#each row as btn, c (c)}
										<span class="ib {tone(btn)}">
											{#if numbered}<i class="num">{numbers.get(`${m}:${r}:${c}`)}</i>{/if}
											{text(btn)}
										</span>
									{/each}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/each}
	</div>

	{#if keyboard}
		<div class="input">Сума й на що: 250 продукти</div>
		<div class="keyboard">
			{#each keyboard as row, r (r)}
				<div class="row">
					{#each row as btn, c (c)}
						<span class="kb {tone(btn)}">{text(btn)}</span>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</figure>

<style>
	.chat {
		--wall: #eef0f3;
		--in: #ffffff;
		--out: #1f2937;
		--out-ink: #ffffff;
		--ink: #111827;
		--soft: #8b929b;
		--line: rgba(17, 24, 39, 0.08);
		--btn: #ffffff;
		--panel: #ffffff;
		--kb: #e6e8ec;
		width: 100%;
		max-width: 360px;
		margin: 0;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 18px;
		background: var(--wall);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
		font-size: 13px;
		line-height: 1.45;
		color: var(--ink);
		user-select: none;
	}
	:global(.dark) .chat {
		--wall: #16181c;
		--in: #23262b;
		--out: #e5e7eb;
		--out-ink: #111827;
		--ink: #eceef1;
		--soft: #80868f;
		--line: rgba(255, 255, 255, 0.08);
		--btn: #2a2d33;
		--panel: #1d1f23;
		--kb: #1d1f23;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 14px;
		background: var(--panel);
		border-bottom: 1px solid var(--line);
	}
	.who {
		display: grid;
		line-height: 1.25;
	}
	.who b {
		font-size: 13.5px;
		font-weight: 600;
	}
	.who span {
		font-size: 11.5px;
		color: var(--soft);
	}
	.body {
		display: grid;
		gap: 8px;
		padding: 14px 12px;
	}
	.bubble {
		max-width: 86%;
		padding: 7px 10px;
		border-radius: 14px;
	}
	.bubble p {
		margin: 0;
		min-height: 1.45em;
	}
	.bubble p.gap {
		min-height: 0.45em;
	}
	.me {
		justify-self: end;
		background: var(--out);
		color: var(--out-ink);
		border-bottom-right-radius: 4px;
	}
	.in {
		background: var(--in);
		border: 1px solid var(--line);
		border-bottom-left-radius: 4px;
	}
	.time {
		float: right;
		margin: 5px 0 -3px 10px;
		font-size: 10.5px;
		color: var(--soft);
	}
	.me .time {
		color: inherit;
		opacity: 0.6;
	}
	.bot {
		display: grid;
		gap: 4px;
		max-width: 92%;
	}
	.bot .bubble {
		max-width: 100%;
	}
	.buttons,
	.keyboard {
		display: grid;
		gap: 4px;
	}
	.row {
		display: flex;
		gap: 4px;
	}
	.ib,
	.kb {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-align: center;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 12.5px;
		font-weight: 500;
		border-radius: 8px;
		background: var(--btn);
		border: 1px solid var(--line);
	}
	.ib {
		padding: 6px 8px;
	}
	.kb {
		padding: 9px 8px;
	}
	/* цвет — как у настоящих кнопок бота: удалить — красная, доход — зелёная */
	.danger {
		background: #dc2626;
		border-color: #dc2626;
		color: #fff;
	}
	.success {
		background: #16a34a;
		border-color: #16a34a;
		color: #fff;
	}
	.primary {
		background: #2563eb;
		border-color: #2563eb;
		color: #fff;
	}
	.num {
		display: inline-grid;
		place-items: center;
		width: 16px;
		height: 16px;
		margin-right: 4px;
		border-radius: 50%;
		background: var(--out);
		color: var(--out-ink);
		font-style: normal;
		font-size: 10.5px;
		font-weight: 700;
		vertical-align: 1px;
	}
	.danger .num {
		background: #fff;
		color: #dc2626;
	}
	.input {
		padding: 9px 14px;
		background: var(--panel);
		border-top: 1px solid var(--line);
		color: var(--soft);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.keyboard {
		padding: 6px;
		background: var(--kb);
	}
</style>
