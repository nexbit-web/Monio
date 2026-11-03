<script lang="ts">
	import { enhance } from '$app/forms';
	import toast from '$lib/toast.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import NativeSelect from '$lib/components/native-select.svelte';
	import ActionButton from '$lib/components/action-button.svelte';
	import Mascot from '$lib/components/mascot.svelte';
	import { ACCENTS, DEFAULT_ACCENT, useAccent } from '$lib/accent';
	import { TIMEZONES, formatDay } from '$lib/date';
	import { onMount } from 'svelte';
	import { resetMode, setMode, userPrefersMode } from 'mode-watcher';
	import Check from '@lucide/svelte/icons/check';
	import Send from '@lucide/svelte/icons/send';
	import Unlink from '@lucide/svelte/icons/unlink';
	import Download from '@lucide/svelte/icons/download';
	import LogOut from '@lucide/svelte/icons/log-out';

	let { data, form } = $props();

	let linking = $state(false);

	// 'system' сбрасывается через resetMode(), остальные — через setMode().
	const themes = [
		{ value: 'light', label: 'Светлый' },
		{ value: 'dark', label: 'Тёмный' },
		{ value: 'system', label: 'Авто' }
	] as const;

	function applyTheme(value: (typeof themes)[number]['value']) {
		if (value === 'system') resetMode();
		else setMode(value);
	}

	// Режим хранится в браузере — на сервере его не знаем, поэтому отмечаем
	// вариант только после загрузки, иначе мигнёт не тот.
	let mounted = $state(false);
	onMount(() => (mounted = true));
	const mode = $derived(mounted ? userPrefersMode.current : null);

	const accent = useAccent();
	/** Аватар — цвета темы; для типовой — графитовый, чтобы не сливался с фоном. */
	const avatarColor = $derived.by(() => {
		const item = ACCENTS.find((candidate) => candidate.id === accent.current);
		return item?.swatch ?? item?.color ?? '#595d66';
	});

	/** Цвет акцента в миниатюре: выбранный, а для типового — как в реальной теме. */
	function railColor(dark: boolean): string {
		if (accent.current !== DEFAULT_ACCENT) {
			return ACCENTS.find((item) => item.id === accent.current)?.color ?? '#111111';
		}
		return dark ? '#eeeeee' : '#1f1f1f';
	}

	const initials = $derived(
		(data.profile.name || data.profile.email).trim().slice(0, 2).toUpperCase()
	);

	const zones = $derived(
		TIMEZONES.some((z) => z.id === data.profile.timezone)
			? TIMEZONES
			: [{ id: data.profile.timezone, label: data.profile.timezone }, ...TIMEZONES]
	);

	/** Строка настроек как в ClickUp: слева название и пояснение, справа — управление. */
	const row = 'grid gap-x-10 gap-y-3 md:grid-cols-[minmax(0,17rem)_1fr]';
	const title = 'text-[15px] font-semibold tracking-tight';
	const hint = 'mt-0.5 text-[13px] leading-5 text-muted-foreground';
	const label = 'mb-1.5 block text-[12px] font-medium text-muted-foreground';
</script>

<svelte:head><title>Настройки · Monio</title></svelte:head>

<!-- Миниатюра Monio в светлом или тёмном режиме: колонка с плитками и панель
     со «строками» текста. -->
{#snippet preview(dark: boolean)}
	{@const rail = railColor(dark)}
	<span class="flex size-full gap-2.5 pt-2.5 pl-2.5 {dark ? 'bg-[#2b2b2b]' : 'bg-[#e6e6e6]'}">
		<span class="flex flex-col gap-1.5 pt-1.5">
			<span class="size-4 rounded-[5px]" style:background={rail}></span>
			<span class="size-4 rounded-[5px] {dark ? 'bg-white/12' : 'bg-black/8'}"></span>
			<span class="size-4 rounded-[5px] {dark ? 'bg-white/12' : 'bg-black/8'}"></span>
		</span>
		<span
			class="flex flex-1 flex-col gap-2 rounded-tl-[10px] p-3 {dark
				? 'bg-[#0d0d0d]'
				: 'bg-[#f8f8f8]'}"
		>
			<span class="flex items-center justify-between">
				<span class="h-1.5 w-6 rounded-full {dark ? 'bg-white/20' : 'bg-black/10'}"></span>
				<span class="size-1.5 rounded-full {dark ? 'bg-white/20' : 'bg-black/10'}"></span>
			</span>
			<span class="flex items-center gap-1.5">
				<span class="h-1.5 w-10 rounded-full {dark ? 'bg-white/20' : 'bg-black/10'}"></span>
				<span class="h-2 w-6 rounded-[3px]" style:background={rail}></span>
			</span>
			<span class="flex items-center gap-1.5">
				<span class="size-1.5 rounded-full" style:background={rail}></span>
				<span class="h-1.5 w-10 rounded-full {dark ? 'bg-white/20' : 'bg-black/10'}"></span>
				<span class="h-1.5 w-10 rounded-full {dark ? 'bg-white/20' : 'bg-black/10'}"></span>
			</span>
		</span>
	</span>
{/snippet}

<div class="pb-10">
	<div class="border-b border-border pb-5">
		<h1 class="text-[20px] font-semibold tracking-tight">Настройки</h1>
		<p class="mt-0.5 text-[13px] text-muted-foreground">
			Как Monio выглядит, профиль, Telegram-бот и данные.
		</p>
	</div>

	<!-- Вид: цвет и режим вместе, без линии между ними — как в ClickUp. -->
	<section class="space-y-8 border-b border-border py-8">
		<div class={row}>
			<div>
				<h2 class={title}>Цвет темы</h2>
				<p class={hint}>Цвет боковой колонки и главных кнопок. Действует в этом браузере.</p>
			</div>
			<div class="flex flex-wrap gap-4 p-1.5">
				{#each ACCENTS as item (item.id)}
					{@const selected = accent.current === item.id}
					{@const color = item.swatch ?? item.color}
					<!-- Выбранный — кольцо того же цвета с зазором, как в ClickUp. -->
					<button
						type="button"
						class="flex size-11 items-center justify-center rounded-[10px] text-white transition-transform hover:scale-105 {selected
							? 'outline-[3px] outline-offset-[5px] outline-solid'
							: ''}"
						style:background={color}
						style:outline-color={color}
						onclick={() => accent.set(item.id)}
						aria-pressed={selected}
						aria-label={item.label}
						title={item.label}
					>
						{#if selected}<Check size={17} strokeWidth={2.75} />{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class={row}>
			<div>
				<h2 class={title}>Режим</h2>
				<p class={hint}>Светлый или тёмный — или автоматически, как в системе.</p>
			</div>
			<div class="flex flex-wrap gap-5 p-1">
				{#each themes as item (item.value)}
					{@const selected = mode === item.value}
					<button
						type="button"
						class="group flex flex-col items-center gap-2.5"
						onclick={() => applyTheme(item.value)}
						aria-pressed={selected}
					>
						<span
							class="relative block h-27.5 w-48 overflow-hidden rounded-[14px] border border-border transition-[outline-color] {selected
								? 'outline-[3px] outline-offset-1 outline-primary outline-solid'
								: 'outline-[3px] outline-offset-1 outline-transparent outline-solid group-hover:outline-foreground/15'}"
						>
							{#if item.value === 'system'}
								{@render preview(false)}
								<span class="absolute inset-0 [clip-path:inset(0_0_0_50%)]">
									{@render preview(true)}
								</span>
							{:else}
								{@render preview(item.value === 'dark')}
							{/if}
						</span>
						<span
							class="text-[13px] {selected
								? 'font-semibold text-foreground'
								: 'text-muted-foreground group-hover:text-foreground'}"
						>
							{item.label}
						</span>
					</button>
				{/each}
			</div>
		</div>
	</section>

	<!-- Профиль -->
	<section class="border-b border-border py-8">
		<div class={row}>
			<div>
				<h2 class={title}>Профиль</h2>
				<p class={hint}>
					Имя для приветствия и часовой пояс — по нему считаются границы дня и месяца.
				</p>
			</div>
			<form
				method="POST"
				action="?/profile"
				class="grid max-w-md gap-4"
				use:enhance={() =>
					async ({ result, update }) => {
						if (result.type === 'success') toast.success('Сохранено');
						if (result.type === 'failure') toast.error(String(result.data?.message ?? 'Ошибка'));
						await update({ reset: false });
					}}
			>
				<div>
					<label for="name" class={label}>Имя</label>
					<Input id="name" name="name" value={data.profile.name} maxlength={60} />
				</div>
				<div>
					<label for="timezone" class={label}>Часовой пояс</label>
					<NativeSelect id="timezone" name="timezone" value={data.profile.timezone}>
						{#each zones as z (z.id)}
							<option value={z.id}>{z.label}</option>
						{/each}
					</NativeSelect>
				</div>
				<Button type="submit" size="sm" class="w-fit">Сохранить</Button>
			</form>
		</div>
	</section>

	<!-- Telegram -->
	<section id="telegram" class="scroll-mt-6 border-b border-border py-8">
		<div class={row}>
			<div>
				<h2 class="{title} flex items-center gap-2"><Mascot size={22} /> Telegram-бот</h2>
				<p class={hint}>
					Записывай траты с телефона за пару секунд: «250 продукты», «+30000 зарплата».
				</p>
			</div>
			<div class="grid max-w-xl gap-3 text-[13px]">
				{#if !data.telegram.configured}
					<div class="grid gap-2 rounded-[12px] bg-block p-4">
						<p class="font-medium">Бот ещё не настроен</p>
						<ol class="list-decimal space-y-1 pl-5 text-muted-foreground">
							<li>
								Открой <a
									href="https://t.me/BotFather"
									class="font-medium text-link hover:underline"
									target="_blank"
									rel="noreferrer">@BotFather</a
								>, отправь <code>/newbot</code> и придумай имя.
							</li>
							<li>Скопируй токен в файл <code>.env</code>: <code>TELEGRAM_BOT_TOKEN=…</code></li>
							<li>Перезапусти Monio и запусти бота: <code>npm run bot</code></li>
							<li>Вернись сюда и нажми «Подключить».</li>
						</ol>
					</div>
				{:else}
					{#if data.telegram.links.length}
						<ul class="grid gap-1.5">
							{#each data.telegram.links as l (l.telegramId)}
								<li class="flex items-center gap-3 rounded-[10px] bg-block px-3 py-2">
									<span class="size-2 shrink-0 rounded-full bg-[#34c759]"></span>
									<span class="min-w-0 flex-1">
										<span class="font-medium">{l.firstName ?? 'Telegram'}</span
										>{#if l.username}<span class="text-muted-foreground"> @{l.username}</span>{/if}
										<span class="block text-[12px] text-muted-foreground"
											>подключён {formatDay(l.createdAt, data.tz)}</span
										>
									</span>
									<ActionButton
										action="?/telegramUnlink"
										id={l.telegramId}
										label="Отвязать"
										size="icon-sm"
										confirmText="Отвязать этот Telegram? Бот перестанет принимать от него траты."
										success="Отвязано"
									>
										<Unlink />
									</ActionButton>
								</li>
							{/each}
						</ul>
					{/if}

					{#if form && 'link' in form && form.link}
						<div class="grid gap-3 rounded-[12px] border border-violet/30 bg-violet/5 p-4">
							{#if form.link.url}
								<p>
									Нажми кнопку — откроется бот, там нажми <b>Start</b>. Ссылка одноразовая и
									действует 15 минут.
								</p>
								<Button
									href={form.link.url}
									target="_blank"
									rel="noreferrer"
									size="sm"
									class="w-fit"
								>
									<Send /> Открыть @{data.telegram.username}
								</Button>
							{/if}
							<p class="text-muted-foreground">
								Или отправь боту команду:
								<code class="rounded bg-muted px-1.5 py-0.5 text-foreground select-all"
									>/start {form.link.code}</code
								>
							</p>
						</div>
					{:else}
						<form
							method="POST"
							action="?/telegramLink"
							use:enhance={() => {
								linking = true;
								return async ({ update }) => {
									await update({ reset: false });
									linking = false;
								};
							}}
						>
							<Button type="submit" size="sm" disabled={linking}>
								<Send />
								{data.telegram.links.length
									? 'Подключить ещё один Telegram'
									: 'Подключить Telegram'}
							</Button>
						</form>
					{/if}
					{#if form && 'message' in form && form.message}
						<p class="text-destructive">{form.message}</p>
					{/if}
				{/if}
			</div>
		</div>
	</section>

	<!-- Данные -->
	<section class="border-b border-border py-8">
		<div class={row}>
			<div>
				<h2 class={title}>Данные</h2>
				<p class={hint}>Все операции одним файлом — открывается в Excel и Google Таблицах.</p>
			</div>
			<div class="flex items-center">
				<Button variant="outline" size="sm" href="/transactions/export?m=all" data-sveltekit-reload>
					<Download /> Скачать всё в CSV
				</Button>
			</div>
		</div>
	</section>

	<!-- Аккаунт и выход -->
	<section class="space-y-8 py-8">
		<div class={row}>
			<div>
				<h2 class={title}>Аккаунт</h2>
				<p class={hint}>Под этой почтой ты входишь в Monio.</p>
			</div>
			<div class="flex items-center gap-3">
				<span
					class="flex size-11 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white"
					style:background={avatarColor}
				>
					{initials}
				</span>
				<div class="min-w-0">
					{#if data.profile.name}<p class="truncate text-[14px] font-semibold">
							{data.profile.name}
						</p>{/if}
					<p class="truncate text-[13px] text-muted-foreground">{data.profile.email}</p>
				</div>
			</div>
		</div>

		<div class={row}>
			<div>
				<h2 class={title}>Выход</h2>
				<p class={hint}>
					Завершить сессию на этом устройстве. Другие устройства останутся в системе.
				</p>
			</div>
			<form method="POST" action="/logout" class="flex items-center">
				<button
					type="submit"
					class="flex h-8 items-center gap-2 rounded-[8px] border border-destructive/40 px-3 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10"
				>
					<LogOut size={15} />
					Выйти из аккаунта
				</button>
			</form>
		</div>
	</section>
</div>
