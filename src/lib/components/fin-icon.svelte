<script lang="ts" module>
	import type { Component } from 'svelte';
	import type { IconKey, IconTone } from '$lib/icon-keys';
	// Иконки по одной: импорт всего @lucide/svelte в dev грузит тысячи модулей.
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Beer from '@lucide/svelte/icons/beer';
	import Bus from '@lucide/svelte/icons/bus';
	import CarTaxiFront from '@lucide/svelte/icons/car-taxi-front';
	import Car from '@lucide/svelte/icons/car';
	import Fuel from '@lucide/svelte/icons/fuel';
	import Plane from '@lucide/svelte/icons/plane';
	import House from '@lucide/svelte/icons/house';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Wifi from '@lucide/svelte/icons/wifi';
	import Repeat from '@lucide/svelte/icons/repeat';
	import HeartPulse from '@lucide/svelte/icons/heart-pulse';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Shirt from '@lucide/svelte/icons/shirt';
	import Clapperboard from '@lucide/svelte/icons/clapperboard';
	import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
	import Gift from '@lucide/svelte/icons/gift';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Baby from '@lucide/svelte/icons/baby';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Sofa from '@lucide/svelte/icons/sofa';
	import Cigarette from '@lucide/svelte/icons/cigarette';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Laptop from '@lucide/svelte/icons/laptop';
	import Wrench from '@lucide/svelte/icons/wrench';
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import Percent from '@lucide/svelte/icons/percent';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Tag from '@lucide/svelte/icons/tag';
	import Package from '@lucide/svelte/icons/package';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Banknote from '@lucide/svelte/icons/banknote';
	import PiggyBank from '@lucide/svelte/icons/piggy-bank';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import Coins from '@lucide/svelte/icons/coins';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Euro from '@lucide/svelte/icons/euro';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';

	type Glyph = Component<{ size?: number; strokeWidth?: number; class?: string }>;

	const GLYPHS: Record<IconKey, Glyph> = {
		groceries: ShoppingCart,
		cafe: UtensilsCrossed,
		coffee: Coffee,
		drinks: Beer,
		transport: Bus,
		taxi: CarTaxiFront,
		car: Car,
		fuel: Fuel,
		travel: Plane,
		home: House,
		utilities: Lightbulb,
		mobile: Smartphone,
		internet: Wifi,
		subscriptions: Repeat,
		health: HeartPulse,
		sport: Dumbbell,
		beauty: Scissors,
		clothes: Shirt,
		fun: Clapperboard,
		games: Gamepad2,
		gifts: Gift,
		education: GraduationCap,
		kids: Baby,
		pets: PawPrint,
		tech: Monitor,
		household: Sofa,
		smoking: Cigarette,
		bank: Landmark,
		salary: Briefcase,
		freelance: Laptop,
		sidejob: Wrench,
		party: PartyPopper,
		cashback: Percent,
		growth: TrendingUp,
		refund: Undo2,
		sale: Tag,
		other: Package,
		card: CreditCard,
		cash: Banknote,
		savings: PiggyBank,
		moneybag: HandCoins,
		coins: Coins,
		wallet: Wallet,
		euro: Euro,
		dollar: DollarSign
	};

	/**
	 * Плитки как иконки приложений в ClickUp: сплошной насыщенный цвет и белый
	 * жирный знак. На жёлтой плитке белый не читается — там знак тёмный.
	 */
	const TONES: Record<IconTone, { bg: string; fg: string }> = {
		green: { bg: '#1f9d63', fg: '#ffffff' },
		orange: { bg: '#f26a1b', fg: '#ffffff' },
		blue: { bg: '#3e63dd', fg: '#ffffff' },
		violet: { bg: '#7b68ee', fg: '#ffffff' },
		pink: { bg: '#ec5f9a', fg: '#ffffff' },
		red: { bg: '#e5484d', fg: '#ffffff' },
		amber: { bg: '#f5b72e', fg: '#2b2100' },
		teal: { bg: '#12a594', fg: '#ffffff' },
		gray: { bg: '#7d8590', fg: '#ffffff' }
	};
</script>

<script lang="ts">
	/**
	 * Иконка категории или счёта: белый знак на сплошной цветной плитке, как в
	 * ClickUp. Без плитки (`tile={false}`) — сам знак цветом плитки.
	 * `icon` — значение из базы (ключ или старое эмодзи). null — «без категории»,
	 * `transfer` — перевод между счетами.
	 */
	import { ICON_META, iconKey } from '$lib/icon-keys';
	import { cn } from '$lib/utils';

	let {
		icon,
		transfer = false,
		size = 32,
		tile = true,
		class: className
	}: {
		icon: string | null | undefined;
		transfer?: boolean;
		/** сторона плитки в px; иконка внутри — чуть больше половины */
		size?: number;
		/** false — одна иконка без плитки */
		tile?: boolean;
		class?: string;
	} = $props();

	const key = $derived(icon ? iconKey(icon) : null);
	const Glyph = $derived(transfer ? ArrowLeftRight : key ? GLYPHS[key] : CircleQuestionMark);
	const tone = $derived(transfer || !key ? TONES.gray : TONES[ICON_META[key].tone]);
	const glyphSize = $derived(tile ? Math.round(size * 0.6) : size);
</script>

<span
	class={cn('inline-grid shrink-0 place-items-center', className)}
	style:width="{size}px"
	style:height="{size}px"
	style:border-radius={tile ? `${Math.round(size * 0.26)}px` : undefined}
	style:color={tile ? tone.fg : tone.bg}
	style:background={tile ? tone.bg : undefined}
	aria-hidden="true"
>
	<Glyph size={glyphSize} strokeWidth={tile ? 2.5 : 2} />
</span>
