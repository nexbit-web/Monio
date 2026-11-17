<script lang="ts">
	/**
	 * Наставник — коротким текстом, без графиков: цель месяца ($100), как идёт
	 * этот месяц, хватает ли доходов на цель и итоги прошлых месяцев.
	 * К цели считается только то, что отложено вручную (перевод на «Накопления»,
	 * в боте — «нз 1000»).
	 */
	import { Button } from '$lib/components/ui/button';
	import PageHeader from '$lib/components/page-header.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import RichText from '$lib/components/rich-text.svelte';
	import { toUsd, toUsdUp } from '$lib/advisor';
	import { reasonRu, usd } from '$lib/advice-ru';
	import { formatMoney } from '$lib/money';
	import { monthGen, monthName, monthPrep } from '$lib/date';
	import { cn } from '$lib/utils';
	import Target from '@lucide/svelte/icons/target';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Info from '@lucide/svelte/icons/info';
	import Send from '@lucide/svelte/icons/send';

	let { data } = $props();

	const a = $derived(data.advice);
	const g = $derived(a.goal);
	const m = $derived(a.month);
	const p = $derived(a.plan);

	const money = (kop: number) => formatMoney(kop);
	const goalUsd = $derived(usd(g.usd));
	/** «нз 3639» — гривны целиком, вверх */
	const nz = (kop: number) => `«нз ${Math.ceil(kop / 100)}»`;

	const rateText = $derived(
		g.rate.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
	);
	const rateDay = $derived(
		g.rateDate ? `${Number(g.rateDate.slice(8))} ${monthGen(g.rateDate.slice(0, 7))}` : null
	);

	const isEmpty = $derived(
		a.mode === 'none' && !m.income && !m.expense && !m.saved && a.history.length === 0
	);

	type Tone = 'good' | 'warn' | 'bad' | 'info';
	type Line = { tone: Tone; text: string };

	// ── Этот месяц ───────────────────────────────────────────────────────
	const savedUsd = $derived(toUsd(m.saved, g.rate));
	const progress = $derived(g.amount > 0 ? Math.max(0, Math.min(1, m.saved / g.amount)) : 0);

	const nowLines = $derived.by((): Line[] => {
		const nudge: Line[] =
			m.free >= m.remaining && m.remaining > 0
				? [
						{
							tone: 'info',
							text: `Свободных денег уже хватает — отложи сейчас: напиши боту **${nz(m.remaining)}**.`
						}
					]
				: [];
		switch (m.status) {
			case 'done':
				return [{ tone: 'good', text: `Цель на ${monthName(m.key).toLowerCase()} выполнена!` }];
			case 'ok':
				return [
					{
						tone: 'good',
						text: `Осталось отложить **${money(m.remaining)}**. Чтобы было из чего, до конца месяца можно тратить ещё **${money(m.left!)}** — около **${money(m.perDay!)} в день**.`
					},
					...nudge
				];
			case 'pace': {
				const end = m.canSave ?? 0;
				return [
					{
						tone: 'warn',
						text: `Траты идут быстрее, чем нужно: при таком темпе ${end > 0 ? `к концу месяца свободных будет около **${money(end)}** — до ${goalUsd} не хватит` : 'к концу месяца ничего не останется'}. Держись в пределах **${money(m.perDay!)} в день**.`
					},
					...nudge
				];
			}
			case 'short':
				return [
					{
						tone: 'bad',
						text: `Осталось отложить **${money(m.remaining)}**, а при нынешних доходах и тратах не хватает **${money(-m.left!)}** — нужен ещё доход или меньше трат.`
					},
					...(m.canSave
						? [
								{
									tone: 'info' as const,
									text: `При нынешнем темпе реально отложить около **${money(m.canSave)}** (${usd(toUsd(m.canSave, g.rate))}) — лучше их, чем ничего.`
								}
							]
						: [])
				];
			case 'no-income':
				return [
					{
						tone: 'info',
						text: 'Доходов в этом месяце пока нет — запиши их, и я посчитаю, сколько можно тратить.'
					}
				];
		}
	});

	// ── Хватает ли на цель ───────────────────────────────────────────────
	const basis = $derived(
		a.mode === 'history'
			? `по ${a.months === 1 ? 'последнему полному месяцу' : `последним ${a.months} полным месяцам`}`
			: `оценка по ${a.days} дн. учёта`
	);
	const average = $derived(
		`В среднем за месяц ты зарабатываешь **${money(a.income)}** и тратишь **${money(a.expense)}**` +
			(a.free >= 0
				? ` — остаётся **${money(a.free)}**.`
				: ` — на **${money(-a.free)}** больше, чем приходит.`)
	);
	const verdict = $derived.by((): Line | null => {
		const limit =
			p.maxSpend > 0
				? `Чтобы откладывать ${goalUsd}, трать не больше **${money(p.maxSpend)}** в месяц.`
				: 'Доход пока меньше самой цели — нужен доход побольше.';
		switch (p.kind) {
			case 'enough':
				return {
					tone: 'good',
					text: `На цель хватает. Откладывай сразу в день зарплаты — **${money(g.amount)}**, а живи на остальное.`
				};
			case 'gap':
				return {
					tone: 'warn',
					text: `До ${goalUsd} не хватает **${money(p.gap)}** в месяц. ${limit}`
				};
			case 'deficit':
				return { tone: 'bad', text: `Сначала нужно выйти в ноль, потом — откладывать. ${limit}` };
			case 'no-income':
				return {
					tone: 'info',
					text: 'Доходов в записях нет — запиши их, и я посчитаю, хватает ли на цель.'
				};
			default:
				return null;
		}
	});

	const toneIcon = { good: CircleCheck, warn: TriangleAlert, bad: CircleX, info: Info };
	const toneClass = {
		good: 'text-signal-green',
		warn: 'text-signal-yellow',
		bad: 'text-signal-red',
		info: 'text-link'
	};
</script>

<svelte:head><title>Наставник · Monio</title></svelte:head>

{#snippet line(l: Line)}
	{@const Icon = toneIcon[l.tone]}
	<p class="flex gap-2.5">
		<Icon class={cn('mt-0.75 size-4 shrink-0', toneClass[l.tone])} />
		<span><RichText text={l.text} /></span>
	</p>
{/snippet}

<div class="mx-auto max-w-2xl">
	<PageHeader title="Наставник" />

	{#if isEmpty}
		<EmptyState
			title="Наставнику нужны данные"
			text="Цель — откладывать {goalUsd} в месяц. Записывай доходы и расходы, а отложенное отмечай в боте: «нз 1000». Я скажу, хватает ли на цель, а в конце месяца — получилось ли."
		>
			<Button href="/settings#telegram" variant="outline"><Send /> Подключить Telegram</Button>
		</EmptyState>
	{:else}
		<div class="grid gap-3 pt-1 pb-8 text-[15px] leading-relaxed">
			<!-- Цель -->
			<section class="rounded-xl border border-violet/30 bg-violet/5 px-5 py-4">
				<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
					<Target class="size-5 text-violet" />
					<h2 class="text-[17px] font-semibold tracking-tight">
						Цель — откладывать {goalUsd} в месяц
					</h2>
					<a
						href="/settings#reports"
						class="ml-auto text-[13px] font-medium text-link hover:underline">Изменить</a
					>
				</div>
				<p class="mt-1 text-[13px] text-muted-foreground">
					{#if rateDay}
						Это <b class="text-foreground">{money(g.amount)}</b> по курсу НБУ на {rateDay}: {rateText}
						₴ за доллар.
					{:else}
						Примерно <b class="text-foreground">{money(g.amount)}</b> — курс НБУ сейчас недоступен,
						считаю по {rateText} ₴.
					{/if}
					Считается только то, что ты отложил сам: в боте —
					<b class="text-foreground">«нз 1000»</b>, здесь — переводом на счёт «Накопления».
				</p>
			</section>

			<!-- Этот месяц -->
			<section class="rounded-xl border border-border bg-card px-5 py-4">
				<h2 class="eyebrow text-muted-foreground">
					{monthName(m.key)} · идёт {m.day}-й день из {m.days}
				</h2>

				<div class="mt-3 flex items-baseline gap-2">
					<span class="font-display text-[28px] leading-none font-semibold tracking-[-0.03em]">
						{usd(savedUsd)}
					</span>
					<span class="text-muted-foreground">из {goalUsd} отложено</span>
				</div>
				<div
					class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-violet/15"
					role="progressbar"
					aria-label="Отложено из цели"
					aria-valuenow={Math.round(progress * 100)}
					aria-valuemin={0}
					aria-valuemax={100}
				>
					<div
						class={cn('h-full rounded-full', m.status === 'done' ? 'bg-signal-green' : 'bg-violet')}
						style:width="{Math.max(progress > 0 ? 2 : 0, progress * 100)}%"
					></div>
				</div>

				<div class="mt-3 grid gap-2">
					<p>
						<RichText
							text="Заработано **{money(m.income)}**, потрачено **{money(
								m.expense
							)}**, отложено **{money(Math.max(0, m.saved))}**."
						/>
						{#if a.mode === 'history' && m.expectedIncome > m.income && m.status !== 'done'}
							<span class="text-muted-foreground">
								Считаю, что за месяц придёт обычных {money(m.expectedIncome)}.
							</span>
						{/if}
					</p>
					{#each nowLines as l, i (i)}{@render line(l)}{/each}
				</div>
			</section>

			<!-- Хватает ли на цель -->
			<section class="rounded-xl border border-border bg-card px-5 py-4">
				<h2 class="eyebrow text-muted-foreground">
					Совет{#if a.mode !== 'none'}<span class="font-normal normal-case"> · {basis}</span>{/if}
				</h2>
				<div class="mt-3 grid gap-2.5">
					{#if a.mode === 'none'}
						<p>
							Учёт идёт {a.days} дн. Записывай всё ещё неделю — и я скажу, хватает ли твоих доходов на
							{goalUsd} в месяц и сколько тогда можно тратить.
						</p>
					{:else}
						<p><RichText text={average} /></p>
						{#if verdict}{@render line(verdict)}{/if}
					{/if}
				</div>
			</section>

			<!-- Итоги месяцев -->
			<section class="rounded-xl border border-border bg-card px-5 py-4">
				<h2 class="eyebrow text-muted-foreground">Итоги месяцев</h2>
				{#if a.history.length === 0}
					<p class="mt-3 text-muted-foreground">
						Первый итог — 1-го числа: скажу, удалось ли отложить {goalUsd} в {monthPrep(m.key)}, а
						если нет — почему.
					</p>
				{:else}
					<ul class="mt-3 grid gap-4">
						{#each a.history as h (h.key)}
							{@const saved = toUsd(h.saved, h.rate)}
							<li class="flex gap-2.5">
								{#if h.met}
									<CircleCheck class="mt-0.75 size-4 shrink-0 text-signal-green" />
								{:else}
									<CircleX class="mt-0.75 size-4 shrink-0 text-signal-red" />
								{/if}
								<div class="min-w-0">
									<p>
										<b class="font-semibold">{monthName(h.key)}</b> —
										{#if h.met}
											<RichText
												text="цель выполнена: отложено **{usd(saved)}** ({money(h.saved)}){saved >
												g.usd
													? `, сверху ${usd(saved - g.usd)}`
													: ''}."
											/>
										{:else if h.saved > 0}
											<RichText
												text="отложено **{usd(saved)}** ({money(
													h.saved
												)}), до {goalUsd} не хватило **{usd(toUsdUp(h.goal - h.saved, h.rate))}**."
											/>
										{:else}
											ничего не отложено.
										{/if}
										{#if h.partial}<span class="text-muted-foreground">Учёт был не весь месяц.</span
											>{/if}
									</p>
									{#if h.reasons.length}
										<ul class="mt-1 grid gap-0.5 text-muted-foreground">
											{#each h.reasons as r, i (i)}
												<li><RichText text={reasonRu(r)} /></li>
											{/each}
										</ul>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<p class="px-1 text-[13px] text-muted-foreground">
				{#if !data.reports.telegram}
					Подключи Telegram — откладывать можно будет одной командой «нз 1000», а бот будет
					присылать итог месяца 1-го числа.
					<a href="/settings#telegram" class="font-medium text-link hover:underline">Подключить →</a
					>
				{:else if data.reports.monthly}
					Итог месяца бот пришлёт в Telegram 1-го числа{data.reports.weekly
						? ', отчёт за неделю — по воскресеньям'
						: ''}.
					<a href="/settings#reports" class="font-medium text-link hover:underline">Настроить</a>
				{:else}
					Итоги месяца в Telegram выключены.
					<a href="/settings#reports" class="font-medium text-link hover:underline">Включить →</a>
				{/if}
			</p>
		</div>
	{/if}
</div>
