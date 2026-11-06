<script lang="ts">
	/** Вход и регистрация как в CRM: карточка по центру на приглушённом фоне. */
	import type { Snippet } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import Mascot from './mascot.svelte';

	let {
		title,
		subtitle,
		children,
		footer
	}: { title: string; subtitle: string; children: Snippet; footer: Snippet } = $props();
</script>

<main class="flex min-h-svh items-center justify-center bg-muted/40 p-4">
	<div class="w-full max-w-sm">
		<Card.Root>
			<Card.Header>
				<div class="mb-1 flex items-center gap-2.5">
					<Mascot size={40} />
					<span class="text-2xl font-semibold tracking-tight">Monio</span>
				</div>
				<Card.Title>{title}</Card.Title>
				<Card.Description>{subtitle}</Card.Description>
			</Card.Header>
			<Card.Content>{@render children()}</Card.Content>
		</Card.Root>

		<p class="mt-4 text-center text-[13px] text-muted-foreground">{@render footer()}</p>
	</div>
</main>
